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

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Modal, Toast } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

import {
  API,
  copy,
  getQuotaPerUnit,
  renderQuota,
  renderQuotaWithAmount,
  showError,
  showInfo,
  showSuccess,
} from '../../helpers';
import { StatusContext } from '../../context/Status';
import { UserContext } from '../../context/User';

import InvitationCard from './InvitationCard';
import RechargeCard from './RechargeCard';
import PaymentConfirmModal from './modals/PaymentConfirmModal';
import QRCodePaymentModal from './modals/QRCodePaymentModal';
import TopupHistoryModal from './modals/TopupHistoryModal';
import TransferModal from './modals/TransferModal';

const OFFICIAL_QR_PAYMENT_TYPES = ['alipay_official', 'wxpay_native'];
const INITIAL_QR_PAYMENT = {
  visible: false,
  tradeNo: '',
  qrCode: '',
  expireTime: 0,
  payWay: '',
};
const QR_POLL_INTERVAL = 3000;

const TopUp = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);

  const [redemptionCode, setRedemptionCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [minTopUp, setMinTopUp] = useState(
    statusState?.status?.min_topup || 1,
  );
  const [topUpCount, setTopUpCount] = useState(
    statusState?.status?.min_topup || 1,
  );
  const [topUpLink, setTopUpLink] = useState(
    statusState?.status?.top_up_link || '',
  );
  const [enableOnlineTopUp, setEnableOnlineTopUp] = useState(
    statusState?.status?.enable_online_topup || false,
  );
  const [priceRatio, setPriceRatio] = useState(statusState?.status?.price || 1);

  const [enableStripeTopUp, setEnableStripeTopUp] = useState(
    statusState?.status?.enable_stripe_topup || false,
  );
  const [enableOfficialTopUp, setEnableOfficialTopUp] = useState(false);
  const [enableAlipayOfficialTopUp, setEnableAlipayOfficialTopUp] =
    useState(false);
  const [enableWeChatOfficialTopUp, setEnableWeChatOfficialTopUp] =
    useState(false);
  const [enableCreemTopUp, setEnableCreemTopUp] = useState(false);
  const [enableWaffoTopUp, setEnableWaffoTopUp] = useState(false);
  const [enableManualTopUp, setEnableManualTopUp] = useState(false);
  const [manualTopUpConfig, setManualTopUpConfig] = useState({
    alipayQRCode: '',
    wechatQRCode: '',
    alipayAmountQRCodes: {},
    wechatAmountQRCodes: {},
    instructions: '',
  });
  const [statusLoading, setStatusLoading] = useState(true);

  const [creemProducts, setCreemProducts] = useState([]);
  const [creemOpen, setCreemOpen] = useState(false);
  const [selectedCreemProduct, setSelectedCreemProduct] = useState(null);

  const [waffoPayMethods, setWaffoPayMethods] = useState([]);
  const [waffoMinTopUp, setWaffoMinTopUp] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [payWay, setPayWay] = useState('');
  const [amountLoading, setAmountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [payMethods, setPayMethods] = useState([]);

  const [qrPayment, setQrPayment] = useState(INITIAL_QR_PAYMENT);
  const [qrPolling, setQrPolling] = useState(false);

  const affFetchedRef = useRef(false);

  const [affLink, setAffLink] = useState('');
  const [openTransfer, setOpenTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState(0);

  const [openHistory, setOpenHistory] = useState(false);

  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [billingPreference, setBillingPreference] =
    useState('subscription_first');
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]);

  const [presetAmounts, setPresetAmounts] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [topupInfo, setTopupInfo] = useState({
    amount_options: [],
    discount: {},
  });

  const isOfficialQRPayment = (payment) =>
    OFFICIAL_QR_PAYMENT_TYPES.includes(payment);

  const getPaymentMinTopUp = (payment) => {
    const payMethod = payMethods.find((method) => method.type === payment);
    const methodMinTopUp = Number(payMethod?.min_topup);
    if (Number.isFinite(methodMinTopUp) && methodMinTopUp > 0) {
      return methodMinTopUp;
    }
    if (payment === 'waffo') {
      return Number(waffoMinTopUp || 1);
    }
    return Number(minTopUp || 1);
  };

  const isPaymentMethodEnabled = (payment) => {
    switch (payment) {
      case 'stripe':
        return enableStripeTopUp;
      case 'alipay_official':
        return enableAlipayOfficialTopUp;
      case 'wxpay_native':
        return enableWeChatOfficialTopUp;
      case 'waffo':
        return enableWaffoTopUp;
      default:
        return enableOnlineTopUp;
    }
  };

  const resetQrPayment = () => {
    setQrPayment(INITIAL_QR_PAYMENT);
    setQrPolling(false);
  };

  const closeQrPaymentModal = () => {
    resetQrPayment();
  };

  const renderAmount = () => {
    return `${Number(amount || 0).toFixed(2)} ${t('元')}`;
  };

  const formatLargeNumber = (num) => {
    return num.toString();
  };

  const generatePresetAmounts = (minAmount) => {
    const base = Math.max(1, Number(minAmount) || 1);
    const multipliers = [1, 5, 10, 30, 50, 100, 300, 500];
    return multipliers.map((multiplier) => ({
      value: base * multiplier,
    }));
  };

  const normalizePayMethods = (rawPayMethods, topupData) => {
    let methods = rawPayMethods || [];
    if (typeof methods === 'string') {
      try {
        methods = JSON.parse(methods);
      } catch (error) {
        methods = [];
      }
    }
    if (!Array.isArray(methods)) {
      return [];
    }

    return methods
      .filter((method) => method && method.name && method.type)
      .map((method) => {
        const normalizedMinTopup = Number(method.min_topup);
        const nextMethod = {
          ...method,
          min_topup: Number.isFinite(normalizedMinTopup)
            ? normalizedMinTopup
            : 0,
        };

        if (
          nextMethod.type === 'stripe' &&
          (!nextMethod.min_topup || nextMethod.min_topup <= 0)
        ) {
          const stripeMinTopUp = Number(topupData.stripe_min_topup);
          if (Number.isFinite(stripeMinTopUp) && stripeMinTopUp > 0) {
            nextMethod.min_topup = stripeMinTopUp;
          }
        }

        if (!nextMethod.color) {
          switch (nextMethod.type) {
            case 'alipay':
            case 'alipay_official':
              nextMethod.color = 'rgba(var(--semi-blue-5), 1)';
              break;
            case 'wxpay':
            case 'wxpay_native':
              nextMethod.color = 'rgba(var(--semi-green-5), 1)';
              break;
            case 'stripe':
              nextMethod.color = 'rgba(var(--semi-purple-5), 1)';
              break;
            default:
              nextMethod.color = 'rgba(var(--semi-primary-5), 1)';
              break;
          }
        }

        return nextMethod;
      });
  };

  const getUserQuota = async () => {
    const res = await API.get('/api/user/self');
    const { success, message, data } = res.data;
    if (success) {
      userDispatch({ type: 'login', payload: data });
      return;
    }
    showError(message);
  };

  const getSubscriptionPlans = async () => {
    setSubscriptionLoading(true);
    try {
      const res = await API.get('/api/subscription/plans');
      if (res.data?.success) {
        setSubscriptionPlans(res.data.data || []);
      }
    } catch (error) {
      setSubscriptionPlans([]);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const getSubscriptionSelf = async () => {
    try {
      const res = await API.get('/api/subscription/self');
      if (res.data?.success) {
        setBillingPreference(
          res.data.data?.billing_preference || 'subscription_first',
        );
        setActiveSubscriptions(res.data.data?.subscriptions || []);
        setAllSubscriptions(res.data.data?.all_subscriptions || []);
      }
    } catch (error) {
      // ignore
    }
  };

  const updateBillingPreference = async (preference) => {
    const previousPreference = billingPreference;
    setBillingPreference(preference);
    try {
      const res = await API.put('/api/subscription/self/preference', {
        billing_preference: preference,
      });
      if (res.data?.success) {
        showSuccess(t('更新成功'));
        setBillingPreference(
          res.data?.data?.billing_preference ||
            preference ||
            previousPreference,
        );
        return;
      }
      showError(res.data?.message || t('更新失败'));
      setBillingPreference(previousPreference);
    } catch (error) {
      showError(t('请求失败'));
      setBillingPreference(previousPreference);
    }
  };

  const getAmount = async (value) => {
    const requestAmount = value === undefined ? topUpCount : value;
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/amount', {
        amount: Number.parseFloat(requestAmount),
      });
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          setAmount(Number.parseFloat(data));
        } else {
          setAmount(0);
          Toast.error({ content: `${t('错误')}：${data}`, id: 'getAmount' });
        }
      } else {
        showError(res);
      }
    } catch (error) {
      // amount fetch failure is non-blocking
    } finally {
      setAmountLoading(false);
    }
  };

  const getStripeAmount = async (value) => {
    const requestAmount = value === undefined ? topUpCount : value;
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/stripe/amount', {
        amount: Number.parseFloat(requestAmount),
      });
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          setAmount(Number.parseFloat(data));
        } else {
          setAmount(0);
          Toast.error({ content: `${t('错误')}：${data}`, id: 'getAmount' });
        }
      } else {
        showError(res);
      }
    } catch (error) {
      // amount fetch failure is non-blocking
    } finally {
      setAmountLoading(false);
    }
  };

  const getTopupInfo = async () => {
    try {
      const res = await API.get('/api/user/topup/info');
      const { success, data } = res.data;
      if (!success) {
        showError(res.data?.message || t('获取充值配置失败'));
        return;
      }

      const nextPayMethods = normalizePayMethods(data.pay_methods, data);
      const nextAmountOptions = Array.isArray(data.amount_options)
        ? data.amount_options
        : [];
      const nextDiscount = data.discount || {};

      const nextEnableOnlineTopUp = data.enable_online_topup || false;
      const nextEnableStripeTopUp = data.enable_stripe_topup || false;
      const nextEnableAlipayOfficialTopUp =
        data.enable_alipay_official_topup || false;
      const nextEnableWeChatOfficialTopUp =
        data.enable_wechat_official_topup || false;
      const nextEnableOfficialTopUp =
        nextEnableAlipayOfficialTopUp || nextEnableWeChatOfficialTopUp;
      const nextEnableCreemTopUp = data.enable_creem_topup || false;
      const nextEnableWaffoTopUp = data.enable_waffo_topup || false;
      const nextEnableManualTopUp = data.enable_manual_topup || false;

      const nextMinTopUp =
        nextEnableOnlineTopUp || nextEnableOfficialTopUp || nextEnableManualTopUp
          ? Number(data.min_topup || 1)
          : nextEnableStripeTopUp
            ? Number(data.stripe_min_topup || 1)
            : nextEnableWaffoTopUp
              ? Number(data.waffo_min_topup || 1)
              : 1;

      setTopupInfo({
        amount_options: nextAmountOptions,
        discount: nextDiscount,
      });
      setPayMethods(nextPayMethods);
      setEnableOnlineTopUp(nextEnableOnlineTopUp);
      setEnableStripeTopUp(nextEnableStripeTopUp);
      setEnableAlipayOfficialTopUp(nextEnableAlipayOfficialTopUp);
      setEnableWeChatOfficialTopUp(nextEnableWeChatOfficialTopUp);
      setEnableOfficialTopUp(nextEnableOfficialTopUp);
      setEnableCreemTopUp(nextEnableCreemTopUp);
      setEnableWaffoTopUp(nextEnableWaffoTopUp);
      setEnableManualTopUp(nextEnableManualTopUp);
      let alipayAmountQRCodes = {};
      let wechatAmountQRCodes = {};
      try {
        alipayAmountQRCodes = JSON.parse(
          data.manual_topup_alipay_amount_qrcodes || '{}',
        );
      } catch (error) {
        alipayAmountQRCodes = {};
      }
      try {
        wechatAmountQRCodes = JSON.parse(
          data.manual_topup_wechat_amount_qrcodes || '{}',
        );
      } catch (error) {
        wechatAmountQRCodes = {};
      }
      setManualTopUpConfig({
        alipayQRCode: data.manual_topup_alipay_qrcode || '',
        wechatQRCode: data.manual_topup_wechat_qrcode || '',
        alipayAmountQRCodes:
          alipayAmountQRCodes && typeof alipayAmountQRCodes === 'object'
            ? alipayAmountQRCodes
            : {},
        wechatAmountQRCodes:
          wechatAmountQRCodes && typeof wechatAmountQRCodes === 'object'
            ? wechatAmountQRCodes
            : {},
        instructions: data.manual_topup_instructions || '',
      });
      setWaffoPayMethods(data.waffo_pay_methods || []);
      setWaffoMinTopUp(Number(data.waffo_min_topup || 1));
      setMinTopUp(nextMinTopUp);
      setTopUpCount(nextMinTopUp);
      setSelectedPreset(null);

      try {
        const products = JSON.parse(data.creem_products || '[]');
        setCreemProducts(Array.isArray(products) ? products : []);
      } catch (error) {
        setCreemProducts([]);
      }

      if (nextAmountOptions.length > 0) {
        setPresetAmounts(
          nextAmountOptions.map((optionAmount) => ({
            value: optionAmount,
            discount: nextDiscount[optionAmount] || 1.0,
          })),
        );
      } else {
        setPresetAmounts(generatePresetAmounts(nextMinTopUp));
      }

      if (nextEnableStripeTopUp && !nextEnableOnlineTopUp && !nextEnableOfficialTopUp) {
        await getStripeAmount(nextMinTopUp);
      } else {
        await getAmount(nextMinTopUp);
      }
    } catch (error) {
      showError(t('获取充值配置异常'));
    }
  };

  const getAffLink = async () => {
    const res = await API.get('/api/user/aff');
    const { success, message, data } = res.data;
    if (success) {
      setAffLink(`${window.location.origin}/register?aff=${data}`);
      return;
    }
    showError(message);
  };

  const topUp = async () => {
    if (redemptionCode === '') {
      showInfo(t('请输入兑换码！'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/api/user/topup', {
        key: redemptionCode,
      });
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('兑换成功！'));
        Modal.success({
          title: t('兑换成功！'),
          content: t('成功兑换额度：') + renderQuota(data),
          centered: true,
        });
        if (userState.user) {
          userDispatch({
            type: 'login',
            payload: {
              ...userState.user,
              quota: userState.user.quota + data,
            },
          });
        }
        setRedemptionCode('');
        return;
      }
      showError(message);
    } catch (error) {
      showError(t('请求失败'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTopUpLink = () => {
    if (!topUpLink) {
      showError(t('超级管理员未设置充值链接！'));
      return;
    }
    window.open(topUpLink, '_blank');
  };

  const preTopUp = async (payment) => {
    if (!isPaymentMethodEnabled(payment)) {
      if (payment === 'stripe') {
        showError(t('管理员未开启 Stripe 充值！'));
      } else if (payment === 'alipay_official') {
        showError(t('管理员未开启支付宝官方扫码支付！'));
      } else if (payment === 'wxpay_native') {
        showError(t('管理员未开启微信官方扫码支付！'));
      } else {
        showError(t('管理员未开启在线充值！'));
      }
      return;
    }

    const paymentMinTopUp = getPaymentMinTopUp(payment);
    setPayWay(payment);
    setPaymentLoading(true);
    try {
      if (payment === 'stripe') {
        await getStripeAmount();
      } else {
        await getAmount();
      }

      if (Number(topUpCount || 0) < paymentMinTopUp) {
        showError(t('充值数量不能小于') + paymentMinTopUp);
        return;
      }
      setOpen(true);
    } catch (error) {
      showError(t('获取金额失败'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const requestOfficialQRCode = async (payment) => {
    const endpoint =
      payment === 'alipay_official'
        ? '/api/user/alipay/pay'
        : '/api/user/wechat/pay';

    const res = await API.post(endpoint, {
      amount: Number.parseInt(topUpCount, 10),
      payment_method: payment,
    });
    const { message, data } = res.data;
    if (message !== 'success') {
      const errorMsg =
        typeof data === 'string' ? data : message || t('支付失败');
      throw new Error(errorMsg);
    }

    setQrPayment({
      visible: true,
      tradeNo: data?.trade_no || '',
      qrCode: data?.qr_code || '',
      expireTime: Number(data?.expire_time || 0),
      payWay: payment,
    });
    setQrPolling(true);
    showInfo(t('二维码已生成，请使用手机扫码完成支付'));
  };

  const onlineTopUp = async () => {
    if (payWay === 'stripe') {
      if (amount === 0) {
        await getStripeAmount();
      }
    } else if (amount === 0) {
      await getAmount();
    }

    const paymentMinTopUp = getPaymentMinTopUp(payWay);
    if (Number(topUpCount || 0) < paymentMinTopUp) {
      showError(t('充值数量不能小于') + paymentMinTopUp);
      return;
    }

    setConfirmLoading(true);
    try {
      let res;
      if (payWay === 'stripe') {
        res = await API.post('/api/user/stripe/pay', {
          amount: Number.parseInt(topUpCount, 10),
          payment_method: 'stripe',
        });
      } else if (isOfficialQRPayment(payWay)) {
        await requestOfficialQRCode(payWay);
        return;
      } else {
        res = await API.post('/api/user/pay', {
          amount: Number.parseInt(topUpCount, 10),
          payment_method: payWay,
        });
      }

      if (res === undefined) {
        showError(t('支付请求失败'));
        return;
      }

      const { message, data } = res.data;
      if (message !== 'success') {
        const errorMsg =
          typeof data === 'string' ? data : message || t('支付失败');
        showError(errorMsg);
        return;
      }

      if (payWay === 'stripe') {
        window.open(data.pay_link, '_blank');
        return;
      }

      const form = document.createElement('form');
      form.action = res.data.url;
      form.method = 'POST';
      const isSafari =
        navigator.userAgent.indexOf('Safari') > -1 &&
        navigator.userAgent.indexOf('Chrome') < 1;
      if (!isSafari) {
        form.target = '_blank';
      }
      Object.keys(data || {}).forEach((key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data[key];
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (error) {
      showError(error?.message || t('支付请求失败'));
    } finally {
      setOpen(false);
      setConfirmLoading(false);
    }
  };

  const creemPreTopUp = async (product) => {
    if (!enableCreemTopUp) {
      showError(t('管理员未开启 Creem 充值！'));
      return;
    }
    setSelectedCreemProduct(product);
    setCreemOpen(true);
  };

  const processCreemCallback = (data) => {
    window.open(data.checkout_url, '_blank');
  };

  const onlineCreemTopUp = async () => {
    if (!selectedCreemProduct) {
      showError(t('请选择产品'));
      return;
    }
    if (!selectedCreemProduct.productId) {
      showError(t('产品配置错误，请联系管理员'));
      return;
    }
    setConfirmLoading(true);
    try {
      const res = await API.post('/api/user/creem/pay', {
        product_id: selectedCreemProduct.productId,
        payment_method: 'creem',
      });
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success') {
          processCreemCallback(data);
        } else {
          const errorMsg =
            typeof data === 'string' ? data : message || t('支付失败');
          showError(errorMsg);
        }
      } else {
        showError(t('支付请求失败'));
      }
    } catch (error) {
      showError(t('支付请求失败'));
    } finally {
      setCreemOpen(false);
      setConfirmLoading(false);
    }
  };

  const waffoTopUp = async (payMethodIndex) => {
    try {
      if (Number(topUpCount || 0) < Number(waffoMinTopUp || 1)) {
        showError(t('充值数量不能小于') + waffoMinTopUp);
        return;
      }
      setPaymentLoading(true);
      const requestBody = {
        amount: Number.parseInt(topUpCount, 10),
      };
      if (payMethodIndex != null) {
        requestBody.pay_method_index = payMethodIndex;
      }
      const res = await API.post('/api/user/waffo/pay', requestBody);
      if (res !== undefined) {
        const { message, data } = res.data;
        if (message === 'success' && data?.payment_url) {
          window.open(data.payment_url, '_blank');
        } else {
          showError(data || t('支付请求失败'));
        }
      } else {
        showError(t('支付请求失败'));
      }
    } catch (error) {
      showError(t('支付请求失败'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const manualTopUp = async (paymentMethod) => {
    if (!enableManualTopUp) {
      showError(t('管理员未开启人工充值'));
      return null;
    }
    if (Number(topUpCount || 0) < Number(minTopUp || 1)) {
      showError(t('充值数量不能小于') + minTopUp);
      return null;
    }
    setPaymentLoading(true);
    try {
      const res = await API.post('/api/user/manual/pay', {
        amount: Number.parseInt(topUpCount, 10),
        payment_method: paymentMethod,
      });
      const { message, data } = res.data;
      if (message !== 'success') {
        showError(typeof data === 'string' ? data : t('提交人工充值订单失败'));
        return null;
      }
      showSuccess(t('订单已创建，请扫码付款'));
      return data;
    } catch (error) {
      showError(t('提交人工充值订单失败'));
      return null;
    } finally {
      setPaymentLoading(false);
    }
  };

  const transfer = async () => {
    if (transferAmount < getQuotaPerUnit()) {
      showError(t('划转金额最低为') + ' ' + renderQuota(getQuotaPerUnit()));
      return;
    }
    const res = await API.post('/api/user/aff_transfer', {
      quota: transferAmount,
    });
    const { success, message } = res.data;
    if (success) {
      showSuccess(message);
      setOpenTransfer(false);
      getUserQuota().then();
      return;
    }
    showError(message);
  };

  const handleAffLinkClick = async () => {
    await copy(affLink);
    showSuccess(t('邀请链接已复制到剪切板'));
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleTransferCancel = () => {
    setOpenTransfer(false);
  };

  const handleOpenHistory = () => {
    setOpenHistory(true);
  };

  const handleHistoryCancel = () => {
    setOpenHistory(false);
  };

  const handleCreemCancel = () => {
    setCreemOpen(false);
    setSelectedCreemProduct(null);
  };

  const selectPresetAmount = async (preset) => {
    setTopUpCount(preset.value);
    setSelectedPreset(preset.value);
    await getAmount(preset.value);
  };

  useEffect(() => {
    if (searchParams.get('show_history') === 'true') {
      setOpenHistory(true);
      searchParams.delete('show_history');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    getUserQuota().then();
    setTransferAmount(getQuotaPerUnit());
  }, []);

  useEffect(() => {
    if (affFetchedRef.current) {
      return;
    }
    affFetchedRef.current = true;
    getAffLink().then();
  }, []);

  useEffect(() => {
    getTopupInfo().then();
    getSubscriptionPlans().then();
    getSubscriptionSelf().then();
  }, []);

  useEffect(() => {
    if (!statusState?.status) {
      return;
    }
    setTopUpLink(statusState.status.top_up_link || '');
    setPriceRatio(statusState.status.price || 1);
    setStatusLoading(false);
  }, [statusState?.status]);

  useEffect(() => {
    if (!qrPayment.visible || !qrPayment.tradeNo) {
      setQrPolling(false);
      return undefined;
    }

    let cancelled = false;
    let pollingLock = false;

    const handleFinalStatus = async (status) => {
      if (status === 'success') {
        resetQrPayment();
        showSuccess(t('支付成功，额度已到账'));
        await getUserQuota();
        setOpenHistory(true);
        return;
      }
      if (status === 'expired') {
        resetQrPayment();
        showError(t('二维码已过期，请重新发起支付'));
        return;
      }
      if (status === 'failed') {
        resetQrPayment();
        showError(t('支付失败，请重新发起支付'));
      }
    };

    const pollTradeStatus = async () => {
      if (cancelled || pollingLock) {
        return;
      }
      pollingLock = true;
      try {
        const res = await API.get(`/api/user/topup/status/${qrPayment.tradeNo}`);
        const { success, message, data } = res.data;
        if (!success) {
          if (!cancelled && message) {
            showError(message);
          }
          return;
        }
        const status = data?.status;
        if (status === 'success' || status === 'expired' || status === 'failed') {
          await handleFinalStatus(status);
        }
      } catch (error) {
        // ignore transient polling errors
      } finally {
        pollingLock = false;
      }
    };

    setQrPolling(true);
    pollTradeStatus();
    const timer = window.setInterval(pollTradeStatus, QR_POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      setQrPolling(false);
    };
  }, [qrPayment.tradeNo, qrPayment.visible, t]);

  return (
    <div className='w-full max-w-7xl mx-auto relative min-h-screen lg:min-h-0 mt-[60px] px-2'>
      <TransferModal
        t={t}
        openTransfer={openTransfer}
        transfer={transfer}
        handleTransferCancel={handleTransferCancel}
        userState={userState}
        renderQuota={renderQuota}
        getQuotaPerUnit={getQuotaPerUnit}
        transferAmount={transferAmount}
        setTransferAmount={setTransferAmount}
      />

      <PaymentConfirmModal
        t={t}
        open={open}
        onlineTopUp={onlineTopUp}
        handleCancel={handleCancel}
        confirmLoading={confirmLoading}
        topUpCount={topUpCount}
        renderQuotaWithAmount={renderQuotaWithAmount}
        amountLoading={amountLoading}
        renderAmount={renderAmount}
        payWay={payWay}
        payMethods={payMethods}
        amountNumber={amount}
        discountRate={topupInfo?.discount?.[topUpCount] || 1.0}
      />

      <QRCodePaymentModal
        t={t}
        visible={qrPayment.visible}
        onCancel={closeQrPaymentModal}
        payWay={qrPayment.payWay}
        qrCode={qrPayment.qrCode}
        tradeNo={qrPayment.tradeNo}
        expireTime={qrPayment.expireTime}
        polling={qrPolling}
      />

      <TopupHistoryModal
        visible={openHistory}
        onCancel={handleHistoryCancel}
        t={t}
      />

      <Modal
        title={t('确定要充值吗？')}
        visible={creemOpen}
        onOk={onlineCreemTopUp}
        onCancel={handleCreemCancel}
        maskClosable={false}
        size='small'
        centered
        confirmLoading={confirmLoading}
      >
        {selectedCreemProduct && (
          <>
            <p>
              {t('产品名称')}：{selectedCreemProduct.name}
            </p>
            <p>
              {t('价格')}：
              {selectedCreemProduct.currency === 'EUR' ? '€' : '$'}
              {selectedCreemProduct.price}
            </p>
            <p>
              {t('充值额度')}：{selectedCreemProduct.quota}
            </p>
            <p>{t('是否确认充值？')}</p>
          </>
        )}
      </Modal>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <RechargeCard
          t={t}
          enableOnlineTopUp={enableOnlineTopUp}
          enableOfficialTopUp={enableOfficialTopUp}
          enableStripeTopUp={enableStripeTopUp}
          enableCreemTopUp={enableCreemTopUp}
          creemProducts={creemProducts}
          creemPreTopUp={creemPreTopUp}
          enableWaffoTopUp={enableWaffoTopUp}
          waffoTopUp={waffoTopUp}
          waffoPayMethods={waffoPayMethods}
          enableManualTopUp={enableManualTopUp}
          manualTopUp={manualTopUp}
          manualTopUpConfig={manualTopUpConfig}
          presetAmounts={presetAmounts}
          selectedPreset={selectedPreset}
          selectPresetAmount={selectPresetAmount}
          formatLargeNumber={formatLargeNumber}
          priceRatio={priceRatio}
          topUpCount={topUpCount}
          minTopUp={minTopUp}
          renderQuotaWithAmount={renderQuotaWithAmount}
          getAmount={getAmount}
          setTopUpCount={setTopUpCount}
          setSelectedPreset={setSelectedPreset}
          renderAmount={renderAmount}
          amountLoading={amountLoading}
          payMethods={payMethods}
          isPaymentMethodEnabled={isPaymentMethodEnabled}
          preTopUp={preTopUp}
          paymentLoading={paymentLoading}
          payWay={payWay}
          redemptionCode={redemptionCode}
          setRedemptionCode={setRedemptionCode}
          topUp={topUp}
          isSubmitting={isSubmitting}
          topUpLink={topUpLink}
          openTopUpLink={openTopUpLink}
          userState={userState}
          renderQuota={renderQuota}
          statusLoading={statusLoading}
          topupInfo={topupInfo}
          onOpenHistory={handleOpenHistory}
          subscriptionLoading={subscriptionLoading}
          subscriptionPlans={subscriptionPlans}
          billingPreference={billingPreference}
          onChangeBillingPreference={updateBillingPreference}
          activeSubscriptions={activeSubscriptions}
          allSubscriptions={allSubscriptions}
          reloadSubscriptionSelf={getSubscriptionSelf}
        />
        <InvitationCard
          t={t}
          userState={userState}
          renderQuota={renderQuota}
          setOpenTransfer={setOpenTransfer}
          affLink={affLink}
          handleAffLinkClick={handleAffLinkClick}
        />
      </div>
    </div>
  );
};

export default TopUp;
