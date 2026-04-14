package controller

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

const (
	PaymentMethodAlipayOfficial = "alipay_official"
	PaymentMethodWeChatNative   = "wxpay_native"
)

type topUpStatusResponse struct {
	TradeNo       string  `json:"trade_no"`
	Status        string  `json:"status"`
	PaymentMethod string  `json:"payment_method"`
	Money         float64 `json:"money"`
	Amount        int64   `json:"amount"`
}

func RequestAlipayOfficialPay(c *gin.Context) {
	requestOfficialPay(c, PaymentMethodAlipayOfficial)
}

func RequestWeChatOfficialPay(c *gin.Context) {
	requestOfficialPay(c, PaymentMethodWeChatNative)
}

func requestOfficialPay(c *gin.Context, paymentMethod string) {
	var req EpayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "invalid request"})
		return
	}
	if req.Amount < getMinTopup() {
		c.JSON(http.StatusOK, gin.H{
			"message": "error",
			"data":    fmt.Sprintf("amount must be greater than or equal to %d", getMinTopup()),
		})
		return
	}

	userID := c.GetInt("id")
	group, err := model.GetUserGroup(userID, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to get user group"})
		return
	}

	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "payment amount is too small"})
		return
	}

	notifyBase := service.GetCallbackAddress()
	var (
		tradeNo string
		subject string
		result  *service.QRPaymentCreateResult
	)

	topUp := &model.TopUp{
		UserId:        userID,
		Amount:        normalizeStoredTopUpAmount(req.Amount),
		Money:         payMoney,
		PaymentMethod: paymentMethod,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}

	switch paymentMethod {
	case PaymentMethodAlipayOfficial:
		if !service.IsAlipayOfficialEnabled() {
			c.JSON(http.StatusOK, gin.H{"message": "error", "data": "alipay official payment is disabled"})
			return
		}
		tradeNo = newOfficialTradeNo("ALI", userID)
		subject = fmt.Sprintf("TopUp %d", req.Amount)
		topUp.TradeNo = tradeNo
		if err := topUp.Insert(); err != nil {
			c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create order"})
			return
		}
		result, err = service.CreateAlipayOfficialPayment(
			tradeNo,
			subject,
			payMoney,
			notifyBase+"/api/alipay/notify",
		)
	case PaymentMethodWeChatNative:
		if !service.IsWeChatPayOfficialEnabled() {
			c.JSON(http.StatusOK, gin.H{"message": "error", "data": "wechat official payment is disabled"})
			return
		}
		tradeNo = newOfficialTradeNo("WX", userID)
		subject = fmt.Sprintf("TopUp %d", req.Amount)
		topUp.TradeNo = tradeNo
		if err := topUp.Insert(); err != nil {
			c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create order"})
			return
		}
		result, err = service.CreateWeChatOfficialPayment(
			tradeNo,
			subject,
			payMoney,
			notifyBase+"/api/wechatpay/notify",
		)
	default:
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "unsupported payment method"})
		return
	}

	if err != nil {
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		log.Printf("official qr payment create failed [%s]: %v", paymentMethod, err)
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create payment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    result,
	})
}

func AlipayOfficialNotify(c *gin.Context) {
	if err := c.Request.ParseForm(); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	params := make(map[string]string, len(c.Request.PostForm))
	for key := range c.Request.PostForm {
		params[key] = c.Request.PostForm.Get(key)
	}

	notifyInfo, err := service.VerifyAlipayOfficialNotification(params)
	if err != nil {
		log.Printf("alipay official notify verify failed: %v", err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if notifyInfo.TradeStatus != "TRADE_SUCCESS" && notifyInfo.TradeStatus != "TRADE_FINISHED" {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	LockOrder(notifyInfo.TradeNo)
	defer UnlockOrder(notifyInfo.TradeNo)

	topUp := model.GetTopUpByTradeNo(notifyInfo.TradeNo)
	if topUp == nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if !moneyEquals(topUp.Money, notifyInfo.Amount) {
		log.Printf(
			"alipay official amount mismatch: tradeNo=%s expected=%.2f actual=%.2f",
			notifyInfo.TradeNo,
			topUp.Money,
			notifyInfo.Amount,
		)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if err := model.CompleteTopUpByTradeNo(notifyInfo.TradeNo); err != nil {
		log.Printf("alipay official complete topup failed: %v", err)
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	_, _ = c.Writer.Write([]byte("success"))
}

func WeChatOfficialNotify(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		writeWeChatOfficialNotifyResponse(c, false, "invalid body")
		return
	}

	notifyInfo, err := service.VerifyWeChatOfficialNotification(body, c.Request.Header)
	if err != nil {
		log.Printf("wechat pay official notify verify failed: %v", err)
		writeWeChatOfficialNotifyResponse(c, false, "signature verify failed")
		return
	}
	if notifyInfo.TradeState != "SUCCESS" {
		writeWeChatOfficialNotifyResponse(c, false, "trade not success")
		return
	}

	LockOrder(notifyInfo.TradeNo)
	defer UnlockOrder(notifyInfo.TradeNo)

	topUp := model.GetTopUpByTradeNo(notifyInfo.TradeNo)
	if topUp == nil {
		writeWeChatOfficialNotifyResponse(c, false, "order not found")
		return
	}
	if !moneyEquals(topUp.Money, notifyInfo.Amount) {
		log.Printf(
			"wechat pay official amount mismatch: tradeNo=%s expected=%.2f actual=%.2f",
			notifyInfo.TradeNo,
			topUp.Money,
			notifyInfo.Amount,
		)
		writeWeChatOfficialNotifyResponse(c, false, "amount mismatch")
		return
	}
	if err := model.CompleteTopUpByTradeNo(notifyInfo.TradeNo); err != nil {
		log.Printf("wechat pay official complete topup failed: %v", err)
		writeWeChatOfficialNotifyResponse(c, false, "complete failed")
		return
	}

	writeWeChatOfficialNotifyResponse(c, true, "success")
}

func GetTopUpStatus(c *gin.Context) {
	tradeNo := c.Param("tradeNo")
	if tradeNo == "" {
		common.ApiErrorMsg(c, "tradeNo is required")
		return
	}

	userID := c.GetInt("id")
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != userID {
		common.ApiErrorMsg(c, "order not found")
		return
	}

	if topUp.Status == common.TopUpStatusPending && isOfficialQRPaymentMethod(topUp.PaymentMethod) {
		LockOrder(tradeNo)
		func() {
			defer UnlockOrder(tradeNo)

			topUp = model.GetTopUpByTradeNo(tradeNo)
			if topUp == nil || topUp.Status != common.TopUpStatusPending {
				return
			}

			var (
				result *service.PaymentQueryResult
				err    error
			)
			switch topUp.PaymentMethod {
			case PaymentMethodAlipayOfficial:
				result, err = service.QueryAlipayOfficialPayment(tradeNo)
			case PaymentMethodWeChatNative:
				result, err = service.QueryWeChatOfficialPayment(tradeNo)
			}
			if err != nil || result == nil {
				if err != nil {
					log.Printf("query official payment status failed [%s]: %v", topUp.PaymentMethod, err)
				}
				return
			}

			if result.Paid && moneyEquals(topUp.Money, result.PaidAmount) {
				if err := model.CompleteTopUpByTradeNo(tradeNo); err != nil {
					log.Printf("complete topup by query failed: %v", err)
				}
				topUp = model.GetTopUpByTradeNo(tradeNo)
				return
			}

			if result.Closed {
				topUp.Status = common.TopUpStatusExpired
				_ = topUp.Update()
			}
		}()
	}

	topUp = model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != userID {
		common.ApiErrorMsg(c, "order not found")
		return
	}

	common.ApiSuccess(c, &topUpStatusResponse{
		TradeNo:       topUp.TradeNo,
		Status:        topUp.Status,
		PaymentMethod: topUp.PaymentMethod,
		Money:         topUp.Money,
		Amount:        topUp.Amount,
	})
}

func newOfficialTradeNo(prefix string, userID int) string {
	seed := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	return fmt.Sprintf("%sUSR%dNO%s", prefix, userID, seed)
}

func normalizeStoredTopUpAmount(amount int64) int64 {
	if operation_setting.GetQuotaDisplayType() != operation_setting.QuotaDisplayTypeTokens {
		return amount
	}
	return decimal.NewFromInt(amount).
		Div(decimal.NewFromFloat(common.QuotaPerUnit)).
		IntPart()
}

func moneyEquals(expected float64, actual float64) bool {
	expectedFen := decimal.NewFromFloat(expected).
		Mul(decimal.NewFromInt(100)).
		Round(0)
	actualFen := decimal.NewFromFloat(actual).
		Mul(decimal.NewFromInt(100)).
		Round(0)
	return expectedFen.Equal(actualFen)
}

func isOfficialQRPaymentMethod(method string) bool {
	return method == PaymentMethodAlipayOfficial || method == PaymentMethodWeChatNative
}

func writeWeChatOfficialNotifyResponse(c *gin.Context, success bool, message string) {
	if success {
		c.JSON(http.StatusOK, gin.H{
			"code":    "SUCCESS",
			"message": message,
		})
		return
	}
	c.JSON(http.StatusBadRequest, gin.H{
		"code":    "FAIL",
		"message": message,
	})
}
