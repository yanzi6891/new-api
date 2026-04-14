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
import { Modal, Typography, Tag, Progress } from '@douyinfe/semi-ui';
import { QRCodeSVG } from 'qrcode.react';
import { SiAlipay, SiWechat } from 'react-icons/si';

const { Text } = Typography;

export default function QRCodePaymentModal({
  t,
  visible,
  onCancel,
  payWay,
  qrCode,
  tradeNo,
  expireTime,
  polling,
}) {
  const isAlipay = payWay === 'alipay_official';
  const title = isAlipay ? t('支付宝扫码支付') : t('微信扫码支付');
  const now = Math.floor(Date.now() / 1000);
  const remain = Math.max(0, Number(expireTime || 0) - now);
  const total = Math.max(1, 30 * 60);
  const percent = Math.max(0, Math.min(100, (remain / total) * 100));

  return (
    <Modal
      title={
        <div className='flex items-center gap-2'>
          {isAlipay ? (
            <SiAlipay size={18} color='#1677FF' />
          ) : (
            <SiWechat size={18} color='#07C160' />
          )}
          {title}
        </div>
      }
      visible={visible}
      footer={null}
      onCancel={onCancel}
      maskClosable={false}
      centered
    >
      <div className='flex flex-col items-center gap-4 py-2'>
        {qrCode ? (
          <div className='rounded-2xl border border-[var(--semi-color-border)] bg-white p-4'>
            <QRCodeSVG value={qrCode} size={220} includeMargin />
          </div>
        ) : null}
        <Text>{t('请使用手机扫码完成支付')}</Text>
        <Tag color='blue'>{tradeNo}</Tag>
        <div className='w-full'>
          <Progress percent={percent} showInfo={false} stroke='var(--semi-color-primary)' />
          <div className='mt-2 flex items-center justify-between'>
            <Text type='secondary'>
              {polling ? t('正在等待支付结果') : t('等待支付')}
            </Text>
            <Text type='secondary'>
              {remain > 0 ? `${remain}s` : t('已过期')}
            </Text>
          </div>
        </div>
      </div>
    </Modal>
  );
}
