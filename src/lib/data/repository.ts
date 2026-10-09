import {
  BusinessHour,
  Category,
  Coupon,
  Neighborhood,
  Option,
  OptionGroup,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  SpecialClosure,
  StoreCurrentStatus,
  StoreSettings,
} from '../types';
import {
  initialBusinessHours,
  initialCategories,
  initialCoupons,
  initialNeighborhoods,
  initialOptionGroups,
  initialOrders,
  initialProducts,
  initialSettings,
  initialSpecialClosures,
} from './mockData';
import { calculateStoreStatus } from '../storeHours';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '../supabase/admin';

// In-memory state for development / preview when Supabase credentials are not yet set
class InMemoryStore {
  settings: StoreSettings = { ...initialSettings };
  categories: Category[] = [...initialCategories];
  products: Product[] = [...initialProducts];
  optionGroups: OptionGroup[] = [...initialOptionGroups];
  neighborhoods: Neighborhood[] = [...initialNeighborhoods];
  businessHours: BusinessHour[] = [...initialBusinessHours];
  specialClosures: SpecialClosure[] = [...initialSpecialClosures];
  coupons: Coupon[] = [...initialCoupons];
  orders: Order[] = [...initialOrders];
  nextOrderNumber = 1002;
}

// Global singleton to persist changes during dev server session
const globalStore = (global as any).__ACAI_STORE__ || new InMemoryStore();
if (process.env.NODE_ENV !== 'production') {
  (global as any).__ACAI_STORE__ = globalStore;
}

export const repository = {
  // CONFIGURAÇÕES
  async getSettings(): Promise<StoreSettings> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('store_settings').select('*').eq('id', 'default').maybeSingle();
        if (data && !error) {
          globalStore.settings = { ...globalStore.settings, ...data };
          return globalStore.settings;
        }
        // Se ainda não existir registro na tabela store_settings, inicializa
        if (!data) {
          const { data: created, error: createErr } = await supabase
            .from('store_settings')
            .upsert({ id: 'default', ...globalStore.settings, updated_at: new Date().toISOString() })
            .select()
            .single();
          if (!createErr && created) {
            globalStore.settings = { ...globalStore.settings, ...created };
            return globalStore.settings;
          }
        }
      } catch (err) {
        console.error('Erro getSettings Supabase:', err);
      }
    }
    return globalStore.settings;
  },

  async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const payload = {
          id: 'default',
          ...updates,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('store_settings')
          .upsert(payload)
          .select()
          .single();
        if (!error && data) {
          globalStore.settings = { ...globalStore.settings, ...data };
          return globalStore.settings;
        }
        if (error) {
          console.error('Erro updateSettings Supabase:', error);
        }
      } catch (err) {
        console.error('Erro updateSettings exception:', err);
      }
    }
    globalStore.settings = { ...globalStore.settings, ...updates };
    return globalStore.settings;
  },

  // CATEGORIAS
  async getCategories(): Promise<Category[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.error('Erro getCategories Supabase:', err);
      }
    }
    return [...globalStore.categories].sort((a, b) => a.display_order - b.display_order);
  },

  async saveCategory(cat: Partial<Category>): Promise<Category> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
        const payload = {
          name: cat.name || 'Nova Categoria',
          name_en: cat.name_en || null,
          name_es: cat.name_es || null,
          description: cat.description || null,
          image_url: cat.image_url || null,
          display_order: cat.display_order ?? 0,
          is_active: cat.is_active ?? true,
          updated_at: new Date().toISOString(),
        };

        if (cat.id && isUuid(cat.id)) {
          const { data, error } = await supabase.from('categories').update(payload).eq('id', cat.id).select().single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase.from('categories').insert([payload]).select().single();
          if (!error && data) {
            cat.id = data.id;
            return data;
          }
        }
      } catch (err) {
        console.error('Erro saveCategory Supabase:', err);
      }
    }
    if (cat.id) {
      const idx = globalStore.categories.findIndex((c: Category) => c.id === cat.id);
      if (idx >= 0) {
        globalStore.categories[idx] = { ...globalStore.categories[idx], ...cat };
        return globalStore.categories[idx];
      }
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: cat.name || 'Nova Categoria',
      display_order: cat.display_order ?? globalStore.categories.length + 1,
      is_active: cat.is_active ?? true,
      ...cat,
    };
    globalStore.categories.push(newCat);
    return newCat;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) return true;
    }
    globalStore.categories = globalStore.categories.filter((c: Category) => c.id !== id);
    return true;
  },

  // GRUPOS DE OPÇÃO / COMPLEMENTOS
  async getOptionGroups(): Promise<OptionGroup[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('option_groups')
          .select('*, options(*)')
          .order('display_order', { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.error('Erro getOptionGroups Supabase:', err);
      }
    }
    return globalStore.optionGroups;
  },

  async saveOptionGroup(group: Partial<OptionGroup>): Promise<OptionGroup> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
        const payload = {
          name: group.name || 'Novo Grupo',
          name_en: group.name_en || null,
          name_es: group.name_es || null,
          description: group.description || null,
          is_required: Boolean(group.is_required),
          min_options: Number(group.min_options || 0),
          max_options: Number(group.max_options || 1),
          display_order: Number(group.display_order || 1),
          is_active: group.is_active !== undefined ? Boolean(group.is_active) : true,
          updated_at: new Date().toISOString(),
        };

        if (group.id && isUuid(group.id)) {
          const { data, error } = await supabase.from('option_groups').update(payload).eq('id', group.id).select().single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase.from('option_groups').insert([payload]).select().single();
          if (!error && data) {
            group.id = data.id;
            return data;
          }
        }
      } catch (err) {
        console.error('Erro saveOptionGroup Supabase:', err);
      }
    }
    if (group.id) {
      const idx = globalStore.optionGroups.findIndex((g: OptionGroup) => g.id === group.id);
      if (idx >= 0) {
        globalStore.optionGroups[idx] = { ...globalStore.optionGroups[idx], ...group };
        return globalStore.optionGroups[idx];
      }
    }
    const newG: OptionGroup = {
      id: `grp-${Date.now()}`,
      name: group.name || 'Novo Grupo',
      is_required: group.is_required ?? false,
      min_options: group.min_options ?? 0,
      max_options: group.max_options ?? 1,
      display_order: group.display_order ?? globalStore.optionGroups.length + 1,
      is_active: group.is_active ?? true,
      options: [],
      ...group,
    };
    globalStore.optionGroups.push(newG);
    return newG;
  },

  async deleteOptionGroup(id: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('option_groups').delete().eq('id', id);
      if (!error) return true;
    }
    globalStore.optionGroups = globalStore.optionGroups.filter((g: OptionGroup) => g.id !== id);
    return true;
  },

  async saveOption(groupId: string, opt: Partial<Option>): Promise<Option> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
        const payload: any = {
          name: opt.name || 'Nova Opção',
          name_en: opt.name_en || null,
          name_es: opt.name_es || null,
          description: opt.description || null,
          price: Number(opt.price || 0),
          image_url: opt.image_url || null,
          is_available: opt.is_available !== undefined ? Boolean(opt.is_available) : true,
          max_quantity_per_item: Number(opt.max_quantity_per_item || 1),
          display_order: Number(opt.display_order || 0),
          updated_at: new Date().toISOString(),
        };
        if (isUuid(groupId)) {
          payload.group_id = groupId;
        }

        if (opt.id && isUuid(opt.id)) {
          const { data, error } = await supabase.from('options').update(payload).eq('id', opt.id).select().single();
          if (!error && data) return data;
        } else if (payload.group_id) {
          const { data, error } = await supabase.from('options').insert([payload]).select().single();
          if (!error && data) {
            opt.id = data.id;
            return data;
          }
        }
      } catch (err) {
        console.error('Erro saveOption Supabase:', err);
      }
    }
    const group = globalStore.optionGroups.find((g: OptionGroup) => g.id === groupId);
    if (!group) throw new Error('Grupo não encontrado');
    if (!group.options) group.options = [];

    if (opt.id) {
      const idx = group.options.findIndex((o: Option) => o.id === opt.id);
      if (idx >= 0) {
        group.options[idx] = { ...group.options[idx], ...opt };
        return group.options[idx];
      }
    }
    const newOpt: Option = {
      id: `opt-${Date.now()}`,
      group_id: groupId,
      name: opt.name || 'Nova Opção',
      price: opt.price || 0,
      is_available: opt.is_available ?? true,
      max_quantity_per_item: opt.max_quantity_per_item ?? 1,
      display_order: opt.display_order ?? group.options.length + 1,
      ...opt,
    };
    group.options.push(newOpt);
    return newOpt;
  },

  async deleteOption(groupId: string, optionId: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('options').delete().eq('id', optionId);
      if (!error) return true;
    }
    const group = globalStore.optionGroups.find((g: OptionGroup) => g.id === groupId);
    if (group && group.options) {
      group.options = group.options.filter((o: Option) => o.id !== optionId);
    }
    return true;
  },

  // PRODUTOS
  async getProducts(): Promise<Product[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .order('display_order', { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.error('Erro getProducts Supabase:', err);
      }
    }
    return globalStore.products;
  },

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  async saveProduct(prod: Partial<Product>): Promise<Product> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');

        const parsePrice = (v: any): number => {
          if (typeof v === 'number') return v;
          if (!v) return 0;
          const clean = String(v).replace(',', '.').trim();
          const n = parseFloat(clean);
          return isNaN(n) ? 0 : n;
        };

        const dbPayload: any = {
          name: prod.name || 'Novo Produto',
          name_en: prod.name_en || null,
          name_es: prod.name_es || null,
          description: prod.description || null,
          description_en: prod.description_en || null,
          description_es: prod.description_es || null,
          image_url: prod.image_url || null,
          price: parsePrice(prod.price),
          promotional_price: prod.promotional_price !== undefined && prod.promotional_price !== null && prod.promotional_price !== ('' as any)
            ? parsePrice(prod.promotional_price)
            : null,
          is_promo_active: Boolean(prod.is_promo_active),
          promo_start_at: prod.promo_start_at || null,
          promo_end_at: prod.promo_end_at || null,
          is_featured: Boolean(prod.is_featured),
          is_bestseller: Boolean(prod.is_bestseller),
          is_new: Boolean(prod.is_new),
          is_available: prod.is_available !== undefined ? Boolean(prod.is_available) : true,
          allow_notes: prod.allow_notes !== undefined ? Boolean(prod.allow_notes) : true,
          display_order: prod.display_order !== undefined ? Number(prod.display_order) : 0,
          updated_at: new Date().toISOString(),
        };

        if (isUuid(prod.category_id)) {
          dbPayload.category_id = prod.category_id;
        }

        if (prod.id && isUuid(prod.id)) {
          const { data, error } = await supabase.from('products').update(dbPayload).eq('id', prod.id).select().single();
          if (!error && data) {
            return { ...data, option_groups: prod.option_groups || [] };
          }
        } else {
          const { data, error } = await supabase.from('products').insert([dbPayload]).select().single();
          if (!error && data) {
            prod.id = data.id;
            return { ...data, option_groups: prod.option_groups || [] };
          }
        }
      } catch (err) {
        console.error('Erro saveProduct Supabase:', err);
      }
    }

    if (prod.id) {
      const idx = globalStore.products.findIndex((p: Product) => p.id === prod.id);
      if (idx >= 0) {
        globalStore.products[idx] = { ...globalStore.products[idx], ...prod };
        return globalStore.products[idx];
      }
    }
    const newP: Product = {
      id: `prod-${Date.now()}`,
      category_id: prod.category_id || globalStore.categories[0]?.id || '',
      name: prod.name || 'Novo Produto',
      price: prod.price || 0,
      is_promo_active: prod.is_promo_active ?? false,
      is_featured: prod.is_featured ?? false,
      is_bestseller: prod.is_bestseller ?? false,
      is_new: prod.is_new ?? false,
      is_available: prod.is_available ?? true,
      allow_notes: prod.allow_notes ?? true,
      display_order: prod.display_order ?? globalStore.products.length + 1,
      option_groups: prod.option_groups || [],
      ...prod,
    };
    globalStore.products.push(newP);
    return newP;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      return !error;
    }
    globalStore.products = globalStore.products.filter((p: Product) => p.id !== id);
    return true;
  },

  // BAIRROS
  async getNeighborhoods(): Promise<Neighborhood[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('neighborhoods').select('*').order('display_order', { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.error('Erro getNeighborhoods Supabase:', err);
      }
    }
    return globalStore.neighborhoods;
  },

  async saveNeighborhood(n: Partial<Neighborhood>): Promise<Neighborhood> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
        const payload: any = {
          name: n.name || 'Novo Bairro',
          delivery_fee: Number(n.delivery_fee || 0),
          min_order_amount: Number(n.min_order_amount || 0),
          free_delivery_threshold: n.free_delivery_threshold != null && (n.free_delivery_threshold as any) !== '' ? Number(n.free_delivery_threshold) : null,
          is_active: n.is_active !== undefined ? Boolean(n.is_active) : true,
          display_order: n.display_order !== undefined ? Number(n.display_order) : 0,
          updated_at: new Date().toISOString(),
        };

        if (n.id && isUuid(n.id)) {
          const { data, error } = await supabase.from('neighborhoods').update(payload).eq('id', n.id).select().single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase.from('neighborhoods').insert([payload]).select().single();
          if (!error && data) {
            n.id = data.id;
            return data;
          }
        }
      } catch (err) {
        console.error('Erro saveNeighborhood Supabase:', err);
      }
    }
    if (n.id) {
      const idx = globalStore.neighborhoods.findIndex((nb: Neighborhood) => nb.id === n.id);
      if (idx >= 0) {
        globalStore.neighborhoods[idx] = { ...globalStore.neighborhoods[idx], ...n };
        return globalStore.neighborhoods[idx];
      }
    }
    const newNb: Neighborhood = {
      id: `nb-${Date.now()}`,
      name: n.name || 'Novo Bairro',
      delivery_fee: Number(n.delivery_fee || 0),
      min_order_amount: Number(n.min_order_amount || 0),
      is_active: n.is_active ?? true,
      display_order: n.display_order ?? globalStore.neighborhoods.length + 1,
      ...n,
    };
    globalStore.neighborhoods.push(newNb);
    return newNb;
  },

  async deleteNeighborhood(id: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('neighborhoods').delete().eq('id', id);
      if (!error) return true;
    }
    globalStore.neighborhoods = globalStore.neighborhoods.filter((nb: Neighborhood) => nb.id !== id);
    return true;
  },

  // HORÁRIOS E FUNCIONAMENTO
  async getBusinessHours(): Promise<BusinessHour[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data } = await supabase.from('business_hours').select('*').order('day_of_week', { ascending: true });
      if (data) return data;
    }
    return globalStore.businessHours;
  },

  async updateBusinessHours(hours: BusinessHour[]): Promise<BusinessHour[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
        for (const h of hours) {
          const payload = {
            day_of_week: Number(h.day_of_week),
            open_time: h.open_time,
            close_time: h.close_time,
            is_closed: Boolean(h.is_closed),
            label: h.label || null,
            updated_at: new Date().toISOString(),
          };

          if (h.id && isUuid(h.id)) {
            await supabase.from('business_hours').update(payload).eq('id', h.id);
          } else {
            const { data: existing } = await supabase
              .from('business_hours')
              .select('id')
              .eq('day_of_week', payload.day_of_week)
              .maybeSingle();

            if (existing) {
              await supabase.from('business_hours').update(payload).eq('id', existing.id);
            } else {
              await supabase.from('business_hours').insert([payload]);
            }
          }
        }
      } catch (err) {
        console.error('Erro updateBusinessHours Supabase:', err);
      }
    }
    globalStore.businessHours = hours;
    return hours;
  },

  async getSpecialClosures(): Promise<SpecialClosure[]> {
    return globalStore.specialClosures;
  },

  async getStoreStatus(): Promise<StoreCurrentStatus> {
    const settings = await this.getSettings();
    const hours = await this.getBusinessHours();
    const closures = await this.getSpecialClosures();
    return calculateStoreStatus(settings, hours, closures);
  },

  // CUPONS
  async getCoupons(): Promise<Coupon[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return data;
      } catch (err) {
        console.error('Erro getCoupons Supabase:', err);
      }
    }
    return globalStore.coupons;
  },

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const cleanCode = code.trim().toUpperCase();
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('coupons').select('*').eq('code', cleanCode).maybeSingle();
        if (data) return data;
      } catch (err) {
        console.error('Erro getCouponByCode Supabase:', err);
      }
    }
    return globalStore.coupons.find((c: Coupon) => c.code.toUpperCase() === cleanCode) || null;
  },

  async saveCoupon(cp: Partial<Coupon>): Promise<Coupon> {
    const cleanCode = (cp.code || 'NOVO10').toUpperCase().trim();
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val || '');
        const payload: any = {
          code: cleanCode,
          discount_type: cp.discount_type || 'percentage',
          discount_value: Number(cp.discount_value || 0),
          min_order_amount: Number(cp.min_order_amount || 0),
          max_uses: cp.max_uses ? Number(cp.max_uses) : null,
          is_active: cp.is_active !== undefined ? Boolean(cp.is_active) : true,
          updated_at: new Date().toISOString(),
        };

        if (cp.id && isUuid(cp.id)) {
          const { data, error } = await supabase.from('coupons').update(payload).eq('id', cp.id).select().single();
          if (!error && data) return data;
        } else {
          const { data, error } = await supabase.from('coupons').insert([payload]).select().single();
          if (!error && data) {
            cp.id = data.id;
            return data;
          }
        }
      } catch (err) {
        console.error('Erro saveCoupon Supabase:', err);
      }
    }

    if (cp.id) {
      const idx = globalStore.coupons.findIndex((c: Coupon) => c.id === cp.id);
      if (idx >= 0) {
        globalStore.coupons[idx] = { ...globalStore.coupons[idx], ...cp, code: cleanCode };
        return globalStore.coupons[idx];
      }
    }
    const newCp: Coupon = {
      id: `cp-${Date.now()}`,
      code: cleanCode,
      discount_type: cp.discount_type || 'percentage',
      discount_value: Number(cp.discount_value || 10),
      min_order_amount: Number(cp.min_order_amount || 0),
      used_count: 0,
      is_active: cp.is_active ?? true,
      ...cp,
    };
    globalStore.coupons.push(newCp);
    return newCp;
  },

  async deleteCoupon(id: string): Promise<boolean> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (!error) return true;
    }
    globalStore.coupons = globalStore.coupons.filter((c: Coupon) => c.id !== id);
    return true;
  },

  // PEDIDOS
  async getOrders(): Promise<Order[]> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const { data } = await supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false });
      if (data) return data;
    }
    return [...globalStore.orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getOrderByCode(orderCode: string): Promise<Order | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.order_code.toUpperCase() === orderCode.toUpperCase()) || null;
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.id === orderId) || null;
  },

  async createOrder(orderData: Omit<Order, 'id' | 'order_number' | 'order_code' | 'created_at' | 'updated_at'>): Promise<Order> {
    const num = globalStore.nextOrderNumber++;
    const orderCode = `AD-${num}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      order_number: num,
      order_code: orderCode,
      created_at: now,
      updated_at: now,
    };

    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        const { items, ...orderRecord } = newOrder;
        const { data: insertedOrder, error: orderErr } = await supabase
          .from('orders')
          .insert([{
            order_code: newOrder.order_code,
            customer_name: newOrder.customer_name,
            customer_phone: newOrder.customer_phone,
            order_type: newOrder.order_type,
            neighborhood_id: newOrder.neighborhood_id || null,
            neighborhood_name: newOrder.neighborhood_name || null,
            address_street: newOrder.address_street || null,
            address_number: newOrder.address_number || null,
            address_complement: newOrder.address_complement || null,
            address_reference: newOrder.address_reference || null,
            order_notes: newOrder.order_notes || null,
            payment_method: newOrder.payment_method,
            payment_status: newOrder.payment_status,
            payment_details: newOrder.payment_details || {},
            order_status: newOrder.order_status,
            subtotal: newOrder.subtotal,
            discount_amount: newOrder.discount_amount,
            delivery_fee: newOrder.delivery_fee,
            total_amount: newOrder.total_amount,
            coupon_code: newOrder.coupon_code || null,
          }])
          .select()
          .single();

        if (!orderErr && insertedOrder) {
          newOrder.id = insertedOrder.id;
          newOrder.order_number = insertedOrder.order_number;

          if (items && items.length > 0) {
            const itemRows = items.map((it) => ({
              order_id: insertedOrder.id,
              product_id: it.product_id && it.product_id.includes('-') && it.product_id.length === 36 ? it.product_id : null,
              product_name: it.product_name,
              unit_price: it.unit_price,
              quantity: it.quantity,
              total_price: it.total_price,
              selected_options: it.selected_options || [],
              item_notes: (it as any).notes || it.item_notes || null,
            }));
            await supabase.from('order_items').insert(itemRows);
          }

          await supabase.from('order_status_history').insert([{
            order_id: insertedOrder.id,
            from_status: null,
            to_status: newOrder.order_status,
            notes: 'Pedido criado',
          }]);
        }
      } catch (err) {
        console.error('Erro ao persistir pedido no Supabase:', err);
      }
    }

    globalStore.orders.unshift(newOrder);

    // Se aplicou cupom, incrementa used_count
    if (newOrder.coupon_code) {
      const coupon = await this.getCouponByCode(newOrder.coupon_code);
      if (coupon) {
        coupon.used_count = (coupon.used_count || 0) + 1;
        if (supabase) {
          try {
            await supabase.from('coupons').update({ used_count: coupon.used_count }).eq('code', newOrder.coupon_code);
          } catch {}
        }
      }
    }

    return newOrder;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order | null> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        await supabase
          .from('orders')
          .update({ order_status: status, updated_at: new Date().toISOString() })
          .or(`id.eq.${orderId},order_code.eq.${orderId}`);
      } catch (err) {
        console.error('Erro ao atualizar status no Supabase:', err);
      }
    }

    const order = await this.getOrderById(orderId);
    if (!order) return null;

    order.order_status = status;
    order.updated_at = new Date().toISOString();
    return order;
  },

  async updatePaymentStatus(orderId: string, status: PaymentStatus, details?: any): Promise<Order | null> {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      try {
        // Primeiro busca os detalhes de pagamento existentes para não sobrescrever QR Code / copia e cola
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('payment_details')
          .or(`id.eq.${orderId},order_code.eq.${orderId}`)
          .maybeSingle();

        const mergedDetails = {
          ...(existingOrder?.payment_details || {}),
          ...(details || {}),
        };

        await supabase
          .from('orders')
          .update({
            payment_status: status,
            payment_details: mergedDetails,
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${orderId},order_code.eq.${orderId}`);
      } catch (err) {
        console.error('Erro ao atualizar status de pagamento no Supabase:', err);
      }
    }

    const order = await this.getOrderById(orderId);
    if (!order) return null;

    order.payment_status = status;
    if (details) {
      order.payment_details = { ...(order.payment_details || {}), ...details };
    }
    order.updated_at = new Date().toISOString();
    return order;
  },
};
