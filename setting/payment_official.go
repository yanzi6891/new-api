package setting

var (
	AlipayOfficialEnabled    bool
	AlipayOfficialAppId      string
	AlipayOfficialPrivateKey string
	AlipayOfficialPublicKey  string
	AlipayOfficialGateway    = "https://openapi.alipay.com/gateway.do"

	WeChatPayOfficialEnabled      bool
	WeChatPayOfficialAppId        string
	WeChatPayOfficialMchId        string
	WeChatPayOfficialSerialNo     string
	WeChatPayOfficialPrivateKey   string
	WeChatPayOfficialAPIv3Key     string
	WeChatPayOfficialPlatformCert string
)
