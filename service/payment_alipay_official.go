package service

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
)

const (
	alipayOfficialMethodPrecreate = "alipay.trade.precreate"
	alipayOfficialMethodQuery     = "alipay.trade.query"
	alipayOfficialProductCode     = "FACE_TO_FACE_PAYMENT"
)

type AlipayOfficialNotification struct {
	TradeNo         string
	ProviderTradeNo string
	TradeStatus     string
	Amount          float64
}

type alipayOfficialClient struct {
	appID      string
	privateKey string
	publicKey  string
	gateway    string
}

func IsAlipayOfficialEnabled() bool {
	return setting.AlipayOfficialEnabled &&
		strings.TrimSpace(setting.AlipayOfficialAppId) != "" &&
		strings.TrimSpace(setting.AlipayOfficialPrivateKey) != "" &&
		strings.TrimSpace(setting.AlipayOfficialPublicKey) != ""
}

func newAlipayOfficialClient() (*alipayOfficialClient, error) {
	if !IsAlipayOfficialEnabled() {
		return nil, fmt.Errorf("alipay official payment is not configured")
	}
	gateway := strings.TrimSpace(setting.AlipayOfficialGateway)
	if gateway == "" {
		gateway = "https://openapi.alipay.com/gateway.do"
	}
	return &alipayOfficialClient{
		appID:      strings.TrimSpace(setting.AlipayOfficialAppId),
		privateKey: setting.AlipayOfficialPrivateKey,
		publicKey:  setting.AlipayOfficialPublicKey,
		gateway:    gateway,
	}, nil
}

func (c *alipayOfficialClient) signParams(params map[string]string) (string, error) {
	privateKey, err := parseRSAPrivateKey(c.privateKey)
	if err != nil {
		return "", err
	}
	signContent := sortedKVString(params, map[string]bool{"sign": true})
	return rsaSHA256SignBase64(privateKey, signContent)
}

func (c *alipayOfficialClient) verifyParams(params map[string]string) error {
	publicKey, err := parseRSAPublicKey(c.publicKey)
	if err != nil {
		return err
	}
	signContent := sortedKVString(params, map[string]bool{
		"sign":      true,
		"sign_type": true,
	})
	return rsaSHA256VerifyBase64(publicKey, signContent, params["sign"])
}

func (c *alipayOfficialClient) doRequest(method string, bizContent any, notifyURL string) (map[string]any, string, error) {
	bizJSON, err := common.Marshal(bizContent)
	if err != nil {
		return nil, "", err
	}

	params := map[string]string{
		"app_id":      c.appID,
		"method":      method,
		"format":      "JSON",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     "1.0",
		"biz_content": string(bizJSON),
	}
	if strings.TrimSpace(notifyURL) != "" {
		params["notify_url"] = strings.TrimSpace(notifyURL)
	}

	signature, err := c.signParams(params)
	if err != nil {
		return nil, "", err
	}
	params["sign"] = signature

	values := url.Values{}
	for key, value := range params {
		values.Set(key, value)
	}

	req, err := http.NewRequest(http.MethodPost, c.gateway, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := GetHttpClient().Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	raw := string(body)
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusBadRequest {
		return nil, raw, fmt.Errorf("alipay gateway returned status %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := common.Unmarshal(body, &payload); err != nil {
		return nil, raw, err
	}

	responseKey := strings.ReplaceAll(method, ".", "_") + "_response"
	responseNode, ok := payload[responseKey].(map[string]any)
	if !ok {
		return nil, raw, fmt.Errorf("alipay response %s missing", responseKey)
	}

	code := mapString(responseNode, "code")
	if code != "10000" {
		return responseNode, raw, fmt.Errorf("alipay request failed: %s %s", code, mapString(responseNode, "sub_msg"))
	}
	return responseNode, raw, nil
}

func CreateAlipayOfficialPayment(tradeNo string, subject string, payMoney float64, notifyURL string) (*QRPaymentCreateResult, error) {
	client, err := newAlipayOfficialClient()
	if err != nil {
		return nil, err
	}

	responseNode, _, err := client.doRequest(alipayOfficialMethodPrecreate, map[string]any{
		"out_trade_no":  tradeNo,
		"total_amount":  yuanString(payMoney),
		"subject":       subject,
		"product_code":  alipayOfficialProductCode,
		"timeout_express": "30m",
	}, notifyURL)
	if err != nil {
		return nil, err
	}

	qrCode := mapString(responseNode, "qr_code")
	if qrCode == "" {
		return nil, fmt.Errorf("alipay response missing qr_code")
	}

	return &QRPaymentCreateResult{
		TradeNo:    tradeNo,
		QRCode:     qrCode,
		ExpireTime: time.Now().Add(30 * time.Minute).Unix(),
	}, nil
}

func QueryAlipayOfficialPayment(tradeNo string) (*PaymentQueryResult, error) {
	client, err := newAlipayOfficialClient()
	if err != nil {
		return nil, err
	}

	responseNode, raw, err := client.doRequest(alipayOfficialMethodQuery, map[string]any{
		"out_trade_no": tradeNo,
	}, "")
	if err != nil {
		return nil, err
	}

	tradeStatus := strings.TrimSpace(mapString(responseNode, "trade_status"))
	amount, _ := strconv.ParseFloat(mapString(responseNode, "buyer_pay_amount"), 64)
	if amount <= 0 {
		amount, _ = strconv.ParseFloat(mapString(responseNode, "total_amount"), 64)
	}

	result := &PaymentQueryResult{
		ProviderTradeNo: mapString(responseNode, "trade_no"),
		PaidAmount:      amount,
		Raw:             raw,
	}
	switch tradeStatus {
	case "TRADE_SUCCESS", "TRADE_FINISHED":
		result.Paid = true
	case "WAIT_BUYER_PAY":
		result.Pending = true
	case "TRADE_CLOSED":
		result.Closed = true
	default:
		result.Pending = true
	}
	return result, nil
}

func VerifyAlipayOfficialNotification(params map[string]string) (*AlipayOfficialNotification, error) {
	client, err := newAlipayOfficialClient()
	if err != nil {
		return nil, err
	}
	if err := client.verifyParams(params); err != nil {
		return nil, err
	}
	if appID := strings.TrimSpace(params["app_id"]); appID != "" && appID != strings.TrimSpace(setting.AlipayOfficialAppId) {
		return nil, fmt.Errorf("alipay app id mismatch")
	}

	amount, err := strconv.ParseFloat(strings.TrimSpace(params["total_amount"]), 64)
	if err != nil {
		amount = 0
	}
	return &AlipayOfficialNotification{
		TradeNo:         strings.TrimSpace(params["out_trade_no"]),
		ProviderTradeNo: strings.TrimSpace(params["trade_no"]),
		TradeStatus:     strings.TrimSpace(params["trade_status"]),
		Amount:          amount,
	}, nil
}

func yuanString(value float64) string {
	return decimal.NewFromFloat(value).Round(2).StringFixed(2)
}

func mapString(node map[string]any, key string) string {
	value, ok := node[key]
	if !ok || value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprintf("%v", value))
}
