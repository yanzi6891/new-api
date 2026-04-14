package service

import (
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"sort"
	"strings"
)

type QRPaymentCreateResult struct {
	TradeNo    string `json:"trade_no"`
	QRCode     string `json:"qr_code"`
	ExpireTime int64  `json:"expire_time"`
}

type PaymentQueryResult struct {
	Paid            bool
	Pending         bool
	Closed          bool
	ProviderTradeNo string
	PaidAmount      float64
	Raw             string
}

func normalizePEM(raw string) string {
	return strings.TrimSpace(strings.ReplaceAll(raw, `\n`, "\n"))
}

func parseRSAPrivateKey(raw string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(normalizePEM(raw)))
	if block == nil {
		return nil, fmt.Errorf("invalid private key pem")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("private key is not rsa")
	}
	return key, nil
}

func parseRSAPublicKey(raw string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(normalizePEM(raw)))
	if block == nil {
		return nil, fmt.Errorf("invalid public key pem")
	}
	if cert, err := x509.ParseCertificate(block.Bytes); err == nil {
		key, ok := cert.PublicKey.(*rsa.PublicKey)
		if !ok {
			return nil, fmt.Errorf("certificate public key is not rsa")
		}
		return key, nil
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	key, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("public key is not rsa")
	}
	return key, nil
}

func parseX509Certificate(raw string) (*x509.Certificate, error) {
	block, _ := pem.Decode([]byte(normalizePEM(raw)))
	if block == nil {
		return nil, fmt.Errorf("invalid certificate pem")
	}
	return x509.ParseCertificate(block.Bytes)
}

func rsaSHA256SignBase64(privateKey *rsa.PrivateKey, content string) (string, error) {
	digest := sha256.Sum256([]byte(content))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

func rsaSHA256VerifyBase64(publicKey *rsa.PublicKey, content string, signature string) error {
	decoded, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return err
	}
	digest := sha256.Sum256([]byte(content))
	return rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, digest[:], decoded)
}

func sortedKVString(params map[string]string, excludes map[string]bool) string {
	keys := make([]string, 0, len(params))
	for key, value := range params {
		if excludes != nil && excludes[key] {
			continue
		}
		if strings.TrimSpace(value) == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", key, params[key]))
	}
	return strings.Join(parts, "&")
}

func decryptAESGCMBase64(key []byte, nonce string, cipherTextBase64 string, associatedData string) ([]byte, error) {
	cipherBytes, err := base64.StdEncoding.DecodeString(cipherTextBase64)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return gcm.Open(nil, []byte(nonce), cipherBytes, []byte(associatedData))
}

func hexSHA256(data string) string {
	sum := sha256.Sum256([]byte(data))
	return hex.EncodeToString(sum[:])
}
