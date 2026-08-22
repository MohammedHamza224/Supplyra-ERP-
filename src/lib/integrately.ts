export const notifyDiscountApproval = async (approvalData: {
  order_number: string;
  discount_percentage: number;
  discount_amount: number;
  reason: string;
  requested_by: string;
}) => {
  const webhookUrl = import.meta.env.VITE_INTEGRATELY_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Integrately webhook URL not configured. Skipping notification.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'new_discount_approval',
        data: approvalData,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send webhook notification', await response.text());
    } else {
      console.log('Webhook notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending webhook notification', error);
  }
};
