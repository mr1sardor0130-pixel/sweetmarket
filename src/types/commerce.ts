import { LocalizedText, MoneyAmount } from './common';
import { ProductMediaKey } from './catalog';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY_FOR_DELIVERY = 'ready_for_delivery',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum DeliveryMethod {
  COURIER = 'courier',
  PICKUP = 'pickup',
}

export interface CartItem {
  productId: string;
  companyId: string;
  variantId: string;
  quantity: number;
  unitPrice: MoneyAmount;
  customNote?: string;
}

export interface CartLineItem {
  lineKey: string;
  productId: string;
  bakeryId: string;
  bakeryName: string;
  mediaKey: ProductMediaKey;
  title: LocalizedText;
  variantId: string;
  variantLabel: LocalizedText;
  weightGrams: number;
  unitPriceUzs: number;
  quantity: number;
  customNote: string;
  customCake?: {
    tierId: string;
    fillingId: string;
  };
}

export interface SellerDeliverySelection {
  bakeryId: string;
  deliveryMethod: DeliveryMethod;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export type OrderPaymentMethod = 'cash_on_delivery' | 'tolovgo';

export interface CheckoutOrderPayload {
  paymentMethod?: OrderPaymentMethod;
  customerName: string;
  customerPhone: string;
  districtId: string;
  address: string;
  coordinates?: GeoCoordinates;
  courierNote?: string;
  deliverySlot: string;
  items: {
    productId: string;
    variantId: string;
    quantity: number;
    customNote?: string;
    bakeryId?: string;
    customCake?: {
      tierId: string;
      fillingId: string;
    };
  }[];
  sellerDeliveryMethods: Record<string, DeliveryMethod>;
}

export interface ConfirmedSellerOrder {
  orderNumber: string;
  bakeryId: string;
  bakeryName: string;
  deliveryMethod: DeliveryMethod;
  subtotalUzs: number;
  deliveryFeeUzs: number;
  totalUzs: number;
  items: {
    productId: string;
    title: LocalizedText;
    variantLabel: LocalizedText;
    quantity: number;
    unitPriceUzs: number;
    lineTotalUzs: number;
    customNote?: string;
  }[];
}

export interface ConfirmedOrderReceipt {
  batchId: string;
  trackingCode?: string;
  handoverPin?: string;
  createdAt: string;
  status?: OrderStatus;
  statusUpdatedAt?: string;
  customerName: string;
  customerPhone: string;
  districtId: string;
  address: string;
  coordinates?: GeoCoordinates;
  courierNote?: string;
  deliverySlot: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentProviderOrderId?: string | number;
  paymentAmountUzs?: number;
  paymentUrl?: string;
  grandTotalUzs: number;
  sellerOrders: ConfirmedSellerOrder[];
}

export interface OrderItem {
  productId: string;
  variantId: string;
  titleSnapshot: string;
  quantity: number;
  unitPrice: MoneyAmount;
}

export interface Order {
  id: string;
  customerUid: string;
  companyId: string;
  items: OrderItem[];
  subtotal: MoneyAmount;
  deliveryFee: MoneyAmount;
  total: MoneyAmount;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  scheduledFor: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
