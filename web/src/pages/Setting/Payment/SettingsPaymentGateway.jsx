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

import React, { useEffect, useState, useRef } from 'react';
import { Button, Form, Row, Col, Typography, Spin } from '@douyinfe/semi-ui';
const { Text } = Typography;
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsPaymentGateway(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    PayAddress: '',
    EpayId: '',
    EpayKey: '',
    Price: 7.3,
    MinTopUp: 1,
    TopupGroupRatio: '',
    CustomCallbackAddress: '',
    PayMethods: '',
    AmountOptions: '',
    AmountDiscount: '',
    ManualTopUpEnabled: false,
    ManualTopUpAlipayQRCode: '',
    ManualTopUpWeChatQRCode: '',
    ManualTopUpAlipayAmountQRCodes: '',
    ManualTopUpWeChatAmountQRCodes: '',
    ManualTopUpInstructions: '',
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        PayAddress: props.options.PayAddress || '',
        EpayId: props.options.EpayId || '',
        EpayKey: props.options.EpayKey || '',
        Price:
          props.options.Price !== undefined
            ? parseFloat(props.options.Price)
            : 7.3,
        MinTopUp:
          props.options.MinTopUp !== undefined
            ? parseFloat(props.options.MinTopUp)
            : 1,
        TopupGroupRatio: props.options.TopupGroupRatio || '',
        CustomCallbackAddress: props.options.CustomCallbackAddress || '',
        PayMethods: props.options.PayMethods || '',
        AmountOptions: props.options.AmountOptions || '',
        AmountDiscount: props.options.AmountDiscount || '',
        ManualTopUpEnabled:
          props.options.ManualTopUpEnabled === 'true' ||
          props.options.ManualTopUpEnabled === true,
        ManualTopUpAlipayQRCode: props.options.ManualTopUpAlipayQRCode || '',
        ManualTopUpWeChatQRCode: props.options.ManualTopUpWeChatQRCode || '',
        ManualTopUpAlipayAmountQRCodes:
          props.options.ManualTopUpAlipayAmountQRCodes || '',
        ManualTopUpWeChatAmountQRCodes:
          props.options.ManualTopUpWeChatAmountQRCodes || '',
        ManualTopUpInstructions: props.options.ManualTopUpInstructions || '',
      };

      // 美化 JSON 展示
      try {
        if (currentInputs.AmountOptions) {
          currentInputs.AmountOptions = JSON.stringify(
            JSON.parse(currentInputs.AmountOptions),
            null,
            2,
          );
        }
      } catch {}
      try {
        if (currentInputs.AmountDiscount) {
          currentInputs.AmountDiscount = JSON.stringify(
            JSON.parse(currentInputs.AmountDiscount),
            null,
            2,
          );
        }
      } catch {}
      try {
        if (currentInputs.ManualTopUpAlipayAmountQRCodes) {
          currentInputs.ManualTopUpAlipayAmountQRCodes = JSON.stringify(
            JSON.parse(currentInputs.ManualTopUpAlipayAmountQRCodes),
            null,
            2,
          );
        }
      } catch {}
      try {
        if (currentInputs.ManualTopUpWeChatAmountQRCodes) {
          currentInputs.ManualTopUpWeChatAmountQRCodes = JSON.stringify(
            JSON.parse(currentInputs.ManualTopUpWeChatAmountQRCodes),
            null,
            2,
          );
        }
      } catch {}

      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitPayAddress = async () => {
    if (props.options.ServerAddress === '') {
      showError(t('请先填写服务器地址'));
      return;
    }

    if (originInputs['TopupGroupRatio'] !== inputs.TopupGroupRatio) {
      if (!verifyJSON(inputs.TopupGroupRatio)) {
        showError(t('充值分组倍率不是合法的 JSON 字符串'));
        return;
      }
    }

    if (originInputs['PayMethods'] !== inputs.PayMethods) {
      if (!verifyJSON(inputs.PayMethods)) {
        showError(t('充值方式设置不是合法的 JSON 字符串'));
        return;
      }
    }

    if (
      originInputs['AmountOptions'] !== inputs.AmountOptions &&
      inputs.AmountOptions.trim() !== ''
    ) {
      if (!verifyJSON(inputs.AmountOptions)) {
        showError(t('自定义充值数量选项不是合法的 JSON 数组'));
        return;
      }
    }

    if (
      originInputs['AmountDiscount'] !== inputs.AmountDiscount &&
      inputs.AmountDiscount.trim() !== ''
    ) {
      if (!verifyJSON(inputs.AmountDiscount)) {
        showError(t('充值金额折扣配置不是合法的 JSON 对象'));
        return;
      }
    }
    if (
      originInputs['ManualTopUpAlipayAmountQRCodes'] !==
        inputs.ManualTopUpAlipayAmountQRCodes &&
      inputs.ManualTopUpAlipayAmountQRCodes.trim() !== '' &&
      !verifyJSON(inputs.ManualTopUpAlipayAmountQRCodes)
    ) {
      showError(t('支付宝固定金额收款码配置必须是合法的 JSON 对象'));
      return;
    }
    if (
      originInputs['ManualTopUpWeChatAmountQRCodes'] !==
        inputs.ManualTopUpWeChatAmountQRCodes &&
      inputs.ManualTopUpWeChatAmountQRCodes.trim() !== '' &&
      !verifyJSON(inputs.ManualTopUpWeChatAmountQRCodes)
    ) {
      showError(t('微信固定金额收款码配置必须是合法的 JSON 对象'));
      return;
    }

    setLoading(true);
    try {
      const options = [
        { key: 'PayAddress', value: removeTrailingSlash(inputs.PayAddress) },
      ];

      if (inputs.EpayId !== '') {
        options.push({ key: 'EpayId', value: inputs.EpayId });
      }
      if (inputs.EpayKey !== undefined && inputs.EpayKey !== '') {
        options.push({ key: 'EpayKey', value: inputs.EpayKey });
      }
      if (inputs.Price !== '') {
        options.push({ key: 'Price', value: inputs.Price.toString() });
      }
      if (inputs.MinTopUp !== '') {
        options.push({ key: 'MinTopUp', value: inputs.MinTopUp.toString() });
      }
      if (inputs.CustomCallbackAddress !== '') {
        options.push({
          key: 'CustomCallbackAddress',
          value: inputs.CustomCallbackAddress,
        });
      }
      if (originInputs['TopupGroupRatio'] !== inputs.TopupGroupRatio) {
        options.push({ key: 'TopupGroupRatio', value: inputs.TopupGroupRatio });
      }
      if (originInputs['PayMethods'] !== inputs.PayMethods) {
        options.push({ key: 'PayMethods', value: inputs.PayMethods });
      }
      if (originInputs['AmountOptions'] !== inputs.AmountOptions) {
        options.push({
          key: 'payment_setting.amount_options',
          value: inputs.AmountOptions,
        });
      }
      if (originInputs['AmountDiscount'] !== inputs.AmountDiscount) {
        options.push({
          key: 'payment_setting.amount_discount',
          value: inputs.AmountDiscount,
        });
      }
      options.push({
        key: 'ManualTopUpEnabled',
        value: inputs.ManualTopUpEnabled ? 'true' : 'false',
      });
      options.push({
        key: 'ManualTopUpAlipayQRCode',
        value: inputs.ManualTopUpAlipayQRCode || '',
      });
      options.push({
        key: 'ManualTopUpWeChatQRCode',
        value: inputs.ManualTopUpWeChatQRCode || '',
      });
      options.push({
        key: 'ManualTopUpAlipayAmountQRCodes',
        value: inputs.ManualTopUpAlipayAmountQRCodes || '',
      });
      options.push({
        key: 'ManualTopUpWeChatAmountQRCodes',
        value: inputs.ManualTopUpWeChatAmountQRCodes || '',
      });
      options.push({
        key: 'ManualTopUpInstructions',
        value: inputs.ManualTopUpInstructions || '',
      });

      // 发送请求
      const requestQueue = options.map((opt) =>
        API.put('/api/option/', {
          key: opt.key,
          value: opt.value,
        }),
      );

      const results = await Promise.all(requestQueue);

      // 检查所有请求是否成功
      const errorResults = results.filter((res) => !res.data.success);
      if (errorResults.length > 0) {
        errorResults.forEach((res) => {
          showError(res.data.message);
        });
      } else {
        showSuccess(t('更新成功'));
        // 更新本地存储的原始值
        setOriginInputs({ ...inputs });
        props.refresh && props.refresh();
      }
    } catch (error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={t('支付设置')}>
          <Text>
            {t(
              '（当前仅支持易支付接口，默认使用上方服务器地址作为回调地址！）',
            )}
          </Text>
          <Text type='secondary'>
            {t(
              '如果你使用的是个人支付宝/微信收款码人工充值，而不是易支付网关，请不要把 PayAddress 配成前端地址，也不要继续保留 alipay/wxpay 的旧在线支付配置。',
            )}
          </Text>
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='PayAddress'
                label={t('支付地址')}
                placeholder={t('例如：https://yourdomain.com')}
                extraText={t(
                  '这里只填写真实易支付网关地址。若仅使用个人收款码人工充值，可留空。',
                )}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='EpayId'
                label={t('易支付商户ID')}
                placeholder={t('例如：0001')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='EpayKey'
                label={t('易支付商户密钥')}
                placeholder={t('敏感信息不会发送到前端显示')}
                type='password'
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='CustomCallbackAddress'
                label={t('回调地址')}
                placeholder={t('例如：https://yourdomain.com')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='Price'
                precision={2}
                label={t('充值价格（x元/美金）')}
                placeholder={t('例如：7，就是7元/美金')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='MinTopUp'
                label={t('最低充值美元数量')}
                placeholder={t('例如：2，就是最低充值2$')}
              />
            </Col>
          </Row>
          <Form.TextArea
            field='TopupGroupRatio'
            label={t('充值分组倍率')}
            placeholder={t('为一个 JSON 文本，键为组名称，值为倍率')}
            autosize
          />
          <Form.TextArea
            field='PayMethods'
            label={t('充值方式设置')}
            placeholder={t('为一个 JSON 文本')}
            autosize
            extraText={t(
              '若仅使用个人收款码人工充值，建议删除 alipay、wxpay，避免钱包页继续出现旧的 submit.php 在线支付入口。',
            )}
          />

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col span={24}>
              <Form.Switch
                field='ManualTopUpEnabled'
                label={t('启用个人收款码人工充值')}
              />
              <Text type='secondary'>
                {t(
                  '个人收款码人工充值不会跳转 submit.php，而是生成待审核订单，到账后由管理员手动补单。',
                )}
              </Text>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Input
                field='ManualTopUpAlipayQRCode'
                label={t('支付宝个人收款码图片地址')}
                placeholder={t('例如：https://example.com/alipay-qrcode.png')}
                extraText={t('请填写可被用户浏览器访问的图片 URL')}
              />
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Input
                field='ManualTopUpWeChatQRCode'
                label={t('微信个人收款码图片地址')}
                placeholder={t('例如：https://example.com/wechat-qrcode.png')}
                extraText={t('请填写可被用户浏览器访问的图片 URL')}
              />
            </Col>
            <Col span={24}>
              <Form.TextArea
                field='ManualTopUpAlipayAmountQRCodes'
                label={t('支付宝固定金额收款码配置')}
                placeholder={t(
                  'JSON 对象，例如：{"20":"https://example.com/alipay-20.png","50":"https://example.com/alipay-50.png"}',
                )}
                autosize
                extraText={t(
                  '可选。个人静态收款码无法自动带金额，如有固定金额收款码，可按充值数量配置对应图片 URL。',
                )}
              />
            </Col>
            <Col span={24}>
              <Form.TextArea
                field='ManualTopUpWeChatAmountQRCodes'
                label={t('微信固定金额收款码配置')}
                placeholder={t(
                  'JSON 对象，例如：{"20":"https://example.com/wechat-20.png","50":"https://example.com/wechat-50.png"}',
                )}
                autosize
                extraText={t(
                  '可选。个人静态收款码无法自动带金额，如有固定金额收款码，可按充值数量配置对应图片 URL。',
                )}
              />
            </Col>
            <Col span={24}>
              <Form.TextArea
                field='ManualTopUpInstructions'
                label={t('人工充值说明')}
                placeholder={t('例如：付款时请备注订单号，付款后等待管理员审核。')}
                autosize
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col span={24}>
              <Form.TextArea
                field='AmountOptions'
                label={t('自定义充值数量选项')}
                placeholder={t(
                  '为一个 JSON 数组，例如：[10, 20, 50, 100, 200, 500]',
                )}
                autosize
                extraText={t(
                  '设置用户可选择的充值数量选项，例如：[10, 20, 50, 100, 200, 500]',
                )}
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col span={24}>
              <Form.TextArea
                field='AmountDiscount'
                label={t('充值金额折扣配置')}
                placeholder={t(
                  '为一个 JSON 对象，例如：{"100": 0.95, "200": 0.9, "500": 0.85}',
                )}
                autosize
                extraText={t(
                  '设置不同充值金额对应的折扣，键为充值金额，值为折扣率，例如：{"100": 0.95, "200": 0.9, "500": 0.85}',
                )}
              />
            </Col>
          </Row>

          <Button onClick={submitPayAddress}>{t('更新支付设置')}</Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
