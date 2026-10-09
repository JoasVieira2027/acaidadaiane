export type StoreSettings = {
  id: string;
  store_name: string;
  logo_url: string;
  banner_url: string;
  whatsapp_number: string;
  address_text: string;
  primary_color: string;
  secondary_color: string;
  currency_symbol: string;
  is_manually_closed: boolean;
  is_manually_opened: boolean;
  closed_message: string;
  open_message: string;
  accept_pix: boolean;
  accept_cash: boolean;
  accept_card_delivery: boolean;
  accept_card_link: boolean;
  allow_pickup: boolean;
  allow_delivery: boolean;
  default_locale: string;
};

export type Category = {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
};

export type Option = {
  id: string;
  group_id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  max_quantity_per_item: number;
  display_order: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  is_required: boolean;
  min_options: number;
  max_options: number;
  display_order: number;
  is_active: boolean;
  options?: Option[];
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description?: string;
  description_en?: string;
  description_es?: string;
  image_url?: string;
  price: number;
  promotional_price?: number | null;
  is_promo_active: boolean;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_available: boolean;
  allow_notes: boolean;
  display_order: number;
  option_groups?: OptionGroup[];
};

export type Neighborhood = {
  id: string;
  name: string;
  delivery_fee: number;
  min_order_amount: number;
  free_delivery_threshold?: number | null;
  is_active: boolean;
  display_order: number;
};

export type BusinessHour = {
  id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time: string; // HH:mm
  close_time: string; // HH:mm
  is_closed: boolean;
  label?: string;
};

export type SpecialClosure = {
  id: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_full_day: boolean;
  notes?: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses?: number | null;
  used_count: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
};

export type SelectedOption = {
  option_id: string;
  group_id: string;
  group_name: string;
  option_name: string;
  price: number;
  quantity: number;
};

export type CartItem = {
  cart_id: string;
  product: Product;
  quantity: number;
  selected_options: SelectedOption[];
  notes?: string;
  unit_price: number;
  total_price: number;
};

export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'cash' | 'card_delivery' | 'card_link';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export type Order = {
  id: string;
  order_number: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  order_type: 'delivery' | 'pickup';
  neighborhood_id?: string | null;
  neighborhood_name?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_reference?: string | null;
  order_notes?: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_details?: {
    qr_code?: string;
    qr_code_base64?: string;
    pix_copia_e_cola?: string;
    transaction_id?: string;
    status_detail?: string;
    payment_link?: string;
  } | null;
  order_status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  coupon_code?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  selected_options: SelectedOption[];
  item_notes?: string | null;
  created_at: string;
};

export type StoreCurrentStatus = {
  isOpen: boolean;
  message: string;
  reason: 'manually_opened' | 'manually_closed' | 'regular_schedule' | 'special_closure' | 'outside_hours';
  nextOpenTime?: string | null;
};
