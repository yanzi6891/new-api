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

import React from 'react';
import { Card, Modal, Skeleton, Typography } from '@douyinfe/semi-ui';
import { SiAlipay, SiStripe, SiWechat } from 'react-icons/si';
import { CreditCard } from 'lucide-react';

const { Text } = Typography;

const PaymentConfirmModal = ({
  t,
  open,
  onlineTopUp,
  handleCancel,
  confirmLoading,
  topUpCount,
  renderQuotaWithAmount,
  amountLoading,
  renderAmount,
  payWay,
  payMethods,
  amountNumber,
  discountRate,
}) => {
  const hasDiscount =
    discountRate && discountRate > 0 && discountRate < 1 && amountNumber > 0;
  const originalAmount = hasDiscount ? amountNumber / discountRate : 0;
  const discountAmount = hasDiscount ? originalAmount - amountNumber : 0;

  const renderPaymentMethod = () => {
    const payMethod = payMethods.find((method) => method.type === payWay);
    const payMethodName = payMethod?.name
      ? payMethod.name
      : payWay === 'alipay' || payWay === 'alipay_official'
        ? t('支付宝')
        : payWay === 'stripe'
          ? 'Stripe'
          : t('微信');

    if (payWay === 'alipay' || payWay === 'alipay_official') {
      return (
        <>
          <SiAlipay className='mr-2' size={16} color='#1677FF' />
          <Text className='text-slate-900 dark:text-slate-100'>
            {payMethodName}
          </Text>
        </>
      );
    }

    if (payWay === 'wxpay' || payWay === 'wxpay_native') {
      return (
        <>
          <SiWechat className='mr-2' size={16} color='#07C160' />
          <Text className='text-slate-900 dark:text-slate-100'>
            {payMethodName}
          </Text>
        </>
      );
    }

    if (payWay === 'stripe') {
      return (
        <>
          <SiStripe className='mr-2' size={16} color='#635BFF' />
          <Text className='text-slate-900 dark:text-slate-100'>
            {payMethodName}
          </Text>
        </>
      );
    }

    return (
      <>
        <CreditCard
          className='mr-2'
          size={16}
          color={payMethod?.color || 'var(--semi-color-text-2)'}
        />
        <Text className='text-slate-900 dark:text-slate-100'>
          {payMethodName}
        </Text>
      </>
    );
  };

  return (
    <Modal
      title={
        <div className='flex items-center'>
          <CreditCard className='mr-2' size={18} />
          {t('充值确认')}
        </div>
      }
      visible={open}
      onOk={onlineTopUp}
      onCancel={handleCancel}
      maskClosable={false}
      size='small'
      centered
      confirmLoading={confirmLoading}
    >
      <div className='space-y-4'>
        <Card className='!rounded-xl !border-0 bg-slate-50 dark:bg-slate-800'>
          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <Text strong className='text-slate-700 dark:text-slate-200'>
                {t('充值数量')}：
              </Text>
              <Text className='text-slate-900 dark:text-slate-100'>
                {renderQuotaWithAmount(topUpCount)}
              </Text>
            </div>

            <div className='flex justify-between items-center'>
              <Text strong className='text-slate-700 dark:text-slate-200'>
                {t('实付金额')}：
              </Text>
              {amountLoading ? (
                <Skeleton.Title style={{ width: 60, height: 16 }} />
              ) : (
                <div className='flex items-baseline space-x-2'>
                  <Text strong className='font-bold' style={{ color: 'red' }}>
                    {renderAmount()}
                  </Text>
                  {hasDiscount ? (
                    <Text size='small' className='text-rose-500'>
                      {Math.round(discountRate * 100)}%
                    </Text>
                  ) : null}
                </div>
              )}
            </div>

            {hasDiscount && !amountLoading ? (
              <>
                <div className='flex justify-between items-center'>
                  <Text className='text-slate-500 dark:text-slate-400'>
                    {t('原价')}：
                  </Text>
                  <Text delete className='text-slate-500 dark:text-slate-400'>
                    {`${originalAmount.toFixed(2)} ${t('元')}`}
                  </Text>
                </div>
                <div className='flex justify-between items-center'>
                  <Text className='text-slate-500 dark:text-slate-400'>
                    {t('优惠')}：
                  </Text>
                  <Text className='text-emerald-600 dark:text-emerald-400'>
                    {`- ${discountAmount.toFixed(2)} ${t('元')}`}
                  </Text>
                </div>
              </>
            ) : null}

            <div className='flex justify-between items-center'>
              <Text strong className='text-slate-700 dark:text-slate-200'>
                {t('支付方式')}：
              </Text>
              <div className='flex items-center'>{renderPaymentMethod()}</div>
            </div>
          </div>
        </Card>
      </div>
    </Modal>
  );
};

export default PaymentConfirmModal;
