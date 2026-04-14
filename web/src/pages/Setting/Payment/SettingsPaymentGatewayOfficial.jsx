/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Col,
  Form,
  Row,
  Spin,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export default function SettingsPaymentGatewayOfficial(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    AlipayOfficialEnabled: false,
    AlipayOfficialAppId: '',
    AlipayOfficialGateway: 'https://openapi.alipay.com/gateway.do',
    AlipayOfficialPrivateKey: '',
    AlipayOfficialPublicKey: '',
    WeChatPayOfficialEnabled: false,
    WeChatPayOfficialAppId: '',
    WeChatPayOfficialMchId: '',
    WeChatPayOfficialSerialNo: '',
    WeChatPayOfficialPrivateKey: '',
    WeChatPayOfficialAPIv3Key: '',
    WeChatPayOfficialPlatformCert: '',
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        AlipayOfficialEnabled:
          props.options.AlipayOfficialEnabled === 'true' ||
          props.options.AlipayOfficialEnabled === true,
        AlipayOfficialAppId: props.options.AlipayOfficialAppId || '',
        AlipayOfficialGateway:
          props.options.AlipayOfficialGateway ||
          'https://openapi.alipay.com/gateway.do',
        AlipayOfficialPrivateKey: props.options.AlipayOfficialPrivateKey || '',
        AlipayOfficialPublicKey: props.options.AlipayOfficialPublicKey || '',
        WeChatPayOfficialEnabled:
          props.options.WeChatPayOfficialEnabled === 'true' ||
          props.options.WeChatPayOfficialEnabled === true,
        WeChatPayOfficialAppId: props.options.WeChatPayOfficialAppId || '',
        WeChatPayOfficialMchId: props.options.WeChatPayOfficialMchId || '',
        WeChatPayOfficialSerialNo:
          props.options.WeChatPayOfficialSerialNo || '',
        WeChatPayOfficialPrivateKey:
          props.options.WeChatPayOfficialPrivateKey || '',
        WeChatPayOfficialAPIv3Key:
          props.options.WeChatPayOfficialAPIv3Key || '',
        WeChatPayOfficialPlatformCert:
          props.options.WeChatPayOfficialPlatformCert || '',
      };
      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const submitOfficialSettings = async () => {
    if (!props.options.ServerAddress) {
      showError(t('请先填写服务器地址'));
      return;
    }

    setLoading(true);
    try {
      const options = [
        {
          key: 'AlipayOfficialEnabled',
          value: inputs.AlipayOfficialEnabled ? 'true' : 'false',
        },
        {
          key: 'WeChatPayOfficialEnabled',
          value: inputs.WeChatPayOfficialEnabled ? 'true' : 'false',
        },
      ];

      if (inputs.AlipayOfficialAppId !== originInputs.AlipayOfficialAppId) {
        options.push({
          key: 'AlipayOfficialAppId',
          value: inputs.AlipayOfficialAppId,
        });
      }
      if (inputs.AlipayOfficialGateway !== originInputs.AlipayOfficialGateway) {
        options.push({
          key: 'AlipayOfficialGateway',
          value: inputs.AlipayOfficialGateway,
        });
      }
      if (inputs.AlipayOfficialPrivateKey) {
        options.push({
          key: 'AlipayOfficialPrivateKey',
          value: inputs.AlipayOfficialPrivateKey,
        });
      }
      if (inputs.AlipayOfficialPublicKey) {
        options.push({
          key: 'AlipayOfficialPublicKey',
          value: inputs.AlipayOfficialPublicKey,
        });
      }

      if (inputs.WeChatPayOfficialAppId !== originInputs.WeChatPayOfficialAppId) {
        options.push({
          key: 'WeChatPayOfficialAppId',
          value: inputs.WeChatPayOfficialAppId,
        });
      }
      if (inputs.WeChatPayOfficialMchId !== originInputs.WeChatPayOfficialMchId) {
        options.push({
          key: 'WeChatPayOfficialMchId',
          value: inputs.WeChatPayOfficialMchId,
        });
      }
      if (
        inputs.WeChatPayOfficialSerialNo !== originInputs.WeChatPayOfficialSerialNo
      ) {
        options.push({
          key: 'WeChatPayOfficialSerialNo',
          value: inputs.WeChatPayOfficialSerialNo,
        });
      }
      if (inputs.WeChatPayOfficialPrivateKey) {
        options.push({
          key: 'WeChatPayOfficialPrivateKey',
          value: inputs.WeChatPayOfficialPrivateKey,
        });
      }
      if (inputs.WeChatPayOfficialAPIv3Key) {
        options.push({
          key: 'WeChatPayOfficialAPIv3Key',
          value: inputs.WeChatPayOfficialAPIv3Key,
        });
      }
      if (
        inputs.WeChatPayOfficialPlatformCert !==
        originInputs.WeChatPayOfficialPlatformCert
      ) {
        options.push({
          key: 'WeChatPayOfficialPlatformCert',
          value: inputs.WeChatPayOfficialPlatformCert,
        });
      }

      const requests = options.map((item) =>
        API.put('/api/option/', {
          key: item.key,
          value: item.value,
        }),
      );
      const results = await Promise.all(requests);
      const failed = results.filter((res) => !res.data.success);
      if (failed.length > 0) {
        failed.forEach((res) => showError(res.data.message));
      } else {
        showSuccess(t('更新成功'));
        props.refresh?.();
      }
    } catch (error) {
      showError(t('更新失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={(values) => setInputs(values)}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={t('官方扫码支付')}>
          <Text>
            {t(
              '第一版只支持 PC 端二维码收款。支付宝走预下单二维码，微信走 Native 扫码支付。',
            )}
          </Text>
          <Banner
            type='info'
            description={`支付宝回调：${props.options.ServerAddress || 'https://yourdomain.com'}/api/alipay/notify`}
          />
          <Banner
            type='info'
            description={`微信回调：${props.options.ServerAddress || 'https://yourdomain.com'}/api/wechatpay/notify`}
            style={{ marginTop: 8 }}
          />

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Form.Switch
                field='AlipayOfficialEnabled'
                label={t('启用支付宝官方扫码')}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Input
                field='AlipayOfficialAppId'
                label={t('支付宝 AppId')}
                placeholder='2021xxxxxxxxxxxx'
              />
            </Col>
            <Col xs={24} md={16}>
              <Form.Input
                field='AlipayOfficialGateway'
                label={t('支付宝网关地址')}
                placeholder='https://openapi.alipay.com/gateway.do'
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.TextArea
                field='AlipayOfficialPrivateKey'
                label={t('支付宝应用私钥')}
                placeholder={t('PKCS1/PKCS8 PEM，敏感信息不会回显')}
                autosize={{ minRows: 6 }}
              />
            </Col>
            <Col span={12}>
              <Form.TextArea
                field='AlipayOfficialPublicKey'
                label={t('支付宝公钥')}
                placeholder={t('PUBLIC KEY PEM，敏感信息不会回显')}
                autosize={{ minRows: 6 }}
              />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 24 }}>
            <Col span={24}>
              <Form.Switch
                field='WeChatPayOfficialEnabled'
                label={t('启用微信官方扫码')}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Input
                field='WeChatPayOfficialAppId'
                label={t('微信 AppId')}
                placeholder='wx1234567890'
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Input
                field='WeChatPayOfficialMchId'
                label={t('微信商户号')}
                placeholder='190000xxxx'
              />
            </Col>
            <Col xs={24} md={8}>
              <Form.Input
                field='WeChatPayOfficialSerialNo'
                label={t('微信证书序列号')}
                placeholder={t('商户 API 证书序列号')}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.TextArea
                field='WeChatPayOfficialPrivateKey'
                label={t('微信商户私钥')}
                placeholder={t('merchant private key PEM，敏感信息不会回显')}
                autosize={{ minRows: 6 }}
              />
            </Col>
            <Col span={12}>
              <Form.TextArea
                field='WeChatPayOfficialPlatformCert'
                label={t('微信平台证书')}
                placeholder={t('platform certificate PEM')}
                autosize={{ minRows: 6 }}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Input
                field='WeChatPayOfficialAPIv3Key'
                label={t('微信 APIv3 Key')}
                type='password'
                placeholder={t('32 位 APIv3 Key，敏感信息不会回显')}
              />
            </Col>
          </Row>

          <Button onClick={submitOfficialSettings}>
            {t('更新官方扫码支付设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
