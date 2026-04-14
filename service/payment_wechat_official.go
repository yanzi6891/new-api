package service

import (
	"crypto/rsa"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
)

const wechatOfficialAPIBase = "https://api.mch.weixin.qq.com"

type WeChatOfficialNotification struct {
	TradeNo         string
	ProviderTradeNo string
	TradeState      string
	Amount          float64
}

type weChatOfficialClient struct {
	appID        string
	mchID        string
	serialNo     string
	privateKey   string
	apiV3Key     string
	platformCert string
}

func IsWeChatPayOfficialEnabled() bool {
	return setting.WeChatPayOfficialEnabled &&
		strings.TrimSpace(setting.WeChatPayOfficialAppId) != "" &&
		strings.TrimSpace(setting.WeChatPayOfficialMchId) != "" &&
		strings.TrimSpace(setting.WeChatPayOfficialSerialNo) != "" &&
		strings.TrimSpace(setting.WeChatPayOfficialPrivateKey) != "" &&
		strings.TrimSpace(setting.WeChatPayOfficialAPIv3Key) != "" &&
		strings.TrimSpace(setting.WeChatPayOfficialPlatformCert) != ""
}

func newWeChatOfficialClient() (*weChatOfficialClient, error) {
	if !IsWeChatPayOfficialEnabled() {
		return nil, fmt.Errorf("wechat pay official payment is not configured")
	}
	if len(strings.TrimSpace(setting.WeChatPayOfficialAPIv3Key)) != 32 {
		return nil, fmt.Errorf("wechat pay api v3 key must be 32 bytes")
	}
	return &weChatOfficialClient{
		appID:        strings.TrimSpace(setting.WeChatPayOfficialAppId),
		mchID:        strings.TrimSpace(setting.WeChatPayOfficialMchId),
		serialNo:     strings.TrimSpace(setting.WeChatPayOfficialSerialNo),
		privateKey:   setting.WeChatPayOfficialPrivateKey,
		apiV3Key:     setting.WeChatPayOfficialAPIv3Key,
		platformCert: setting.WeChatPayOfficialPlatformCert,
	}, nil
}

func (c *weChatOfficialClient) authorization(method string, requestPath string, body string) (string, error) {
	privateKey, err := parseRSAPrivateKey(c.privateKey)
	if err != nil {
		return "", err
	}
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	nonce := common.GetRandomString(32)
	signContent := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n", method, requestPath, timestamp, nonce, body)
	signature, err := rsaSHA256SignBase64(privateKey, signContent)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf(
		`WECHATPAY2-SHA256-RSA2048 mchid="%s",nonce_str="%s",signature="%s",timestamp="%s",serial_no="%s"`,
		c.mchID,
		nonce,
		signature,
		timestamp,
		c.serialNo,
	), nil
}

func (c *weChatOfficialClient) doRequest(method string, requestPath string, body any) ([]byte, error) {
	bodyStr := ""
	if body != nil {
		bodyBytes, err := common.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyStr = string(bodyBytes)
	}

	auth, err := c.authorization(method, requestPath, bodyStr)
	if err != nil {
		return nil, err
	}

	var bodyReader io.Reader
	if bodyStr != "" {
		bodyReader = strings.NewReader(bodyStr)
	}
	req, err := http.NewRequest(method, wechatOfficialAPIBase+requestPath, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", auth)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "new-api/wechatpay-official")

	resp, err := GetHttpClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("wechat pay gateway returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return respBody, nil
}

func CreateWeChatOfficialPayment(tradeNo string, description string, payMoney float64, notifyURL string) (*QRPaymentCreateResult, error) {
	client, err := newWeChatOfficialClient()
	if err != nil {
		return nil, err
	}
	requestPath := "/v3/pay/transactions/native"
	expireTime := time.Now().Add(30 * time.Minute).UTC()
	amountFen := yuanToFen(payMoney)
	body := map[string]any{
		"appid":       client.appID,
		"mchid":       client.mchID,
		"description": description,
		"out_trade_no": tradeNo,
		"time_expire": expireTime.Format(time.RFC3339),
		"notify_url":  notifyURL,
		"amount": map[string]any{
			"total":    amountFen,
			"currency": "CNY",
		},
	}

	respBody, err := client.doRequest(http.MethodPost, requestPath, body)
	if err != nil {
		return nil, err
	}

	var payload map[string]any
	if err := common.Unmarshal(respBody, &payload); err != nil {
		return nil, err
	}
	qrCode := mapString(payload, "code_url")
	if qrCode == "" {
		return nil, fmt.Errorf("wechat pay response missing code_url")
	}
	return &QRPaymentCreateResult{
		TradeNo:    tradeNo,
		QRCode:     qrCode,
		ExpireTime: expireTime.Unix(),
	}, nil
}

func QueryWeChatOfficialPayment(tradeNo string) (*PaymentQueryResult, error) {
	client, err := newWeChatOfficialClient()
	if err != nil {
		return nil, err
	}
	requestPath := fmt.Sprintf("/v3/pay/transactions/out-trade-no/%s?mchid=%s", url.PathEscape(tradeNo), url.QueryEscape(client.mchID))
	respBody, err := client.doRequest(http.MethodGet, requestPath, nil)
	if err != nil {
		return nil, err
	}

	var payload map[string]any
	if err := common.Unmarshal(respBody, &payload); err != nil {
		return nil, err
	}

	amountTotal := 0
	if amountNode, ok := payload["amount"].(map[string]any); ok {
		if totalStr := mapString(amountNode, "total"); totalStr != "" {
			amountTotal = common.String2Int(totalStr)
		}
	}

	result := &PaymentQueryResult{
		ProviderTradeNo: mapString(payload, "transaction_id"),
		PaidAmount:      fenToYuan(amountTotal),
		Raw:             string(respBody),
	}

	switch strings.TrimSpace(mapString(payload, "trade_state")) {
	case "SUCCESS":
		result.Paid = true
	case "CLOSED", "REVOKED", "PAYERROR":
		result.Closed = true
	default:
		result.Pending = true
	}
	return result, nil
}

func VerifyWeChatOfficialNotification(body []byte, headers http.Header) (*WeChatOfficialNotification, error) {
	client, err := newWeChatOfficialClient()
	if err != nil {
		return nil, err
	}

	if err := client.verifyNotificationSignature(body, headers); err != nil {
		return nil, err
	}

	type resourceNode struct {
		Algorithm      string `json:"algorithm"`
		Ciphertext     string `json:"ciphertext"`
		AssociatedData string `json:"associated_data"`
		Nonce          string `json:"nonce"`
	}
	type notifyPayload struct {
		EventType string       `json:"event_type"`
		Resource  resourceNode `json:"resource"`
	}
	var payload notifyPayload
	if err := common.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if payload.Resource.Algorithm != "AEAD_AES_256_GCM" {
		return nil, fmt.Errorf("unsupported wechat pay notify algorithm: %s", payload.Resource.Algorithm)
	}

	plainBytes, err := decryptAESGCMBase64([]byte(client.apiV3Key), payload.Resource.Nonce, payload.Resource.Ciphertext, payload.Resource.AssociatedData)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	if err := common.Unmarshal(plainBytes, &result); err != nil {
		return nil, err
	}

	amountTotal := 0
	if amountNode, ok := result["amount"].(map[string]any); ok {
		if totalStr := mapString(amountNode, "total"); totalStr != "" {
			amountTotal = common.String2Int(totalStr)
		}
	}

	return &WeChatOfficialNotification{
		TradeNo:         mapString(result, "out_trade_no"),
		ProviderTradeNo: mapString(result, "transaction_id"),
		TradeState:      mapString(result, "trade_state"),
		Amount:          fenToYuan(amountTotal),
	}, nil
}

func (c *weChatOfficialClient) verifyNotificationSignature(body []byte, headers http.Header) error {
	cert, err := parseX509Certificate(c.platformCert)
	if err != nil {
		return err
	}
	publicKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return fmt.Errorf("wechat pay platform cert public key is not rsa")
	}

	timestamp := strings.TrimSpace(headers.Get("Wechatpay-Timestamp"))
	nonce := strings.TrimSpace(headers.Get("Wechatpay-Nonce"))
	signature := strings.TrimSpace(headers.Get("Wechatpay-Signature"))
	if timestamp == "" || nonce == "" || signature == "" {
		return fmt.Errorf("wechat pay notify headers missing")
	}
	signContent := fmt.Sprintf("%s\n%s\n%s\n", timestamp, nonce, string(body))
	return rsaSHA256VerifyBase64(publicKey, signContent, signature)
}

func yuanToFen(amount float64) int64 {
	return decimal.NewFromFloat(amount).Mul(decimal.NewFromInt(100)).Round(0).IntPart()
}

func fenToYuan(amount int) float64 {
	return decimal.NewFromInt(int64(amount)).Div(decimal.NewFromInt(100)).InexactFloat64()
}
