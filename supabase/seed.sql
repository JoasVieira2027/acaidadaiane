-- =========================================================
-- SEED DATA: AÇAÍ DAIANE
-- Dados iniciais realistas e completos para demonstração e produção
-- =========================================================

-- 1. Configurações da Loja
INSERT INTO store_settings (
    id, store_name, logo_url, banner_url, whatsapp_number, address_text,
    primary_color, secondary_color, is_manually_closed, is_manually_opened,
    closed_message, open_message
) VALUES (
    'default',
    'Açaí Daiane',
    '',
    '',
    '5581999998888',
    'Av. Principal, 450 - Boa Viagem, Recife - PE',
    '#4c1d95',
    '#9333ea',
    false,
    false,
    'Estamos fora do horário de atendimento. Nosso atendimento retorna às 13:00!',
    'Estamos abertos! Faça seu pedido e receba o açaí mais cremoso da cidade.'
) ON CONFLICT (id) DO NOTHING;

-- 2. Categorias
INSERT INTO categories (id, name, name_en, name_es, description, description_en, description_es, display_order, is_active)
VALUES 
('c1000000-0000-0000-0000-000000000001', 'Copos Tradicionais', 'Classic Cups', 'Vasos Tradicionales', 'Açaí artesanal batido na hora com opções de tamanhos e montagem', 'Freshly blended acai with size options and customizable toppings', 'Açaí artesanal con opciones de tamaño y aderezos', 1, true),
('c1000000-0000-0000-0000-000000000002', 'Tigelas Especiais', 'Special Bowls', 'Bowls Especiales', 'Tigelas generosas preparadas com camadas especiais e frutas frescas', 'Generous bowls layered with signature creams and fresh fruits', 'Bowls generosos con capas exclusivas y frutas frescas', 2, true),
('c1000000-0000-0000-0000-000000000003', 'Barcas & Roletas', 'Boats & Platters', 'Barcas y Bandejas', 'Para compartilhar com a família ou amigos, com fartura de acompanhamentos', 'Perfect for sharing with family and friends, loaded with toppings', 'Para compartir en familia o amigos, con abundancia de acompañamientos', 3, true),
('c1000000-0000-0000-0000-000000000004', 'Bebidas & Shakes', 'Beverages & Shakes', 'Bebidas y Batidos', 'Sucos naturais, vitaminas de açaí e água mineral gelada', 'Natural juices, acai milkshakes and chilled mineral water', 'Jugos naturales, batidos de açaí y agua mineral fría', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Grupos de Opções
INSERT INTO option_groups (id, name, name_en, name_es, description, is_required, min_options, max_options, display_order, is_active)
VALUES
('g1000000-0000-0000-0000-000000000001', 'Tamanho', 'Size', 'Tamaño', 'Selecione o tamanho do seu pedido', true, 1, 1, 1, true),
('g1000000-0000-0000-0000-000000000002', 'Frutas Frescas (Até 3 gratuitas)', 'Fresh Fruits (Up to 3 free)', 'Frutas Frescas (Hasta 3 gratis)', 'Escolha até 3 frutas frescas', false, 0, 3, 2, true),
('g1000000-0000-0000-0000-000000000003', 'Complementos (Até 3 gratuitos)', 'Toppings (Up to 3 free)', 'Complementos (Hasta 3 gratis)', 'Escolha até 3 complementos secos', false, 0, 3, 3, true),
('g1000000-0000-0000-0000-000000000004', 'Cobertura (Até 2 gratuitas)', 'Syrups (Up to 2 free)', 'Coberturas (Hasta 2 gratis)', 'Escolha suas caldas favoritas', false, 0, 2, 4, true),
('g1000000-0000-0000-0000-000000000005', 'Adicionais Premium (Opcional)', 'Premium Add-ons (Optional)', 'Adicionales Premium (Opcional)', 'Turbine seu açaí com chocolates e cremes nobres', false, 0, 5, 5, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Opções dentro dos Grupos
-- Grupo Tamanho
INSERT INTO options (id, group_id, name, name_en, name_es, price, display_order, is_available) VALUES
('o1000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000001', 'Copo 300ml', '300ml Cup', 'Vaso 300ml', 0.00, 1, true),
('o1000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000001', 'Copo 500ml', '500ml Cup', 'Vaso 500ml', 6.00, 2, true),
('o1000000-0000-0000-0000-000000000003', 'g1000000-0000-0000-0000-000000000001', 'Copo 700ml', '700ml Cup', 'Vaso 700ml', 12.00, 3, true)
ON CONFLICT (id) DO NOTHING;

-- Grupo Frutas
INSERT INTO options (id, group_id, name, name_en, name_es, price, display_order, is_available) VALUES
('o2000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000002', 'Banana em rodelas', 'Sliced Banana', 'Plátano en rodajas', 0.00, 1, true),
('o2000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000002', 'Morango fresco', 'Fresh Strawberry', 'Fresa fresca', 0.00, 2, true),
('o2000000-0000-0000-0000-000000000003', 'g1000000-0000-0000-0000-000000000002', 'Kiwi em fatias', 'Sliced Kiwi', 'Kiwi en rodajas', 0.00, 3, true),
('o2000000-0000-0000-0000-000000000004', 'g1000000-0000-0000-0000-000000000002', 'Manga picada', 'Diced Mango', 'Mango picado', 0.00, 4, true),
('o2000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000002', 'Uva sem semente', 'Seedless Grape', 'Uva sin semilla', 0.00, 5, true)
ON CONFLICT (id) DO NOTHING;

-- Grupo Complementos
INSERT INTO options (id, group_id, name, name_en, name_es, price, display_order, is_available) VALUES
('o3000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000003', 'Leite em Pó Ninho', 'Powdered Milk', 'Leche en polvo', 0.00, 1, true),
('o3000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000003', 'Granola Tradicional', 'Granola', 'Granola tradicional', 0.00, 2, true),
('o3000000-0000-0000-0000-000000000003', 'g1000000-0000-0000-0000-000000000003', 'Paçoca triturada', 'Peanut Candy', 'Paçoca molida', 0.00, 3, true),
('o3000000-0000-0000-0000-000000000004', 'g1000000-0000-0000-0000-000000000003', 'Flocos de Arroz', 'Crispy Rice Flakes', 'Copos de arroz', 0.00, 4, true),
('o3000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000003', 'Chocoball crocante', 'Crispy Chocolate Balls', 'Bolitas de chocolate crocante', 0.00, 5, true)
ON CONFLICT (id) DO NOTHING;

-- Grupo Coberturas
INSERT INTO options (id, group_id, name, name_en, name_es, price, display_order, is_available) VALUES
('o4000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000004', 'Leite Condensado', 'Condensed Milk', 'Leche condensada', 0.00, 1, true),
('o4000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000004', 'Calda de Chocolate', 'Chocolate Syrup', 'Sirope de chocolate', 0.00, 2, true),
('o4000000-0000-0000-0000-000000000003', 'g1000000-0000-0000-0000-000000000004', 'Calda de Morango', 'Strawberry Syrup', 'Sirope de fresa', 0.00, 3, true),
('o4000000-0000-0000-0000-000000000004', 'g1000000-0000-0000-0000-000000000004', 'Mel de Abelha', 'Honey', 'Miel pura', 0.00, 4, true)
ON CONFLICT (id) DO NOTHING;

-- Grupo Adicionais Premium
INSERT INTO options (id, group_id, name, name_en, name_es, price, display_order, is_available) VALUES
('o5000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000005', 'Nutella Original (Dose Generosa)', 'Original Nutella Scoop', 'Nutella Original', 5.50, 1, true),
('o5000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000005', 'Creme de Ninho Trufado', 'Truffled Milk Powder Cream', 'Crema de Ninho trufada', 4.50, 2, true),
('o5000000-0000-0000-0000-000000000003', 'g1000000-0000-0000-0000-000000000005', 'KitKat Crocante Picado', 'Crushed KitKat', 'KitKat picado', 4.00, 3, true),
('o5000000-0000-0000-0000-000000000004', 'g1000000-0000-0000-0000-000000000005', 'Gotas de Chocolate Belga', 'Belgian Chocolate Chips', 'Gotas de chocolate belga', 4.50, 4, true),
('o5000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000005', 'Bombom Ouro Branco', 'Ouro Branco Chocolate Bonbon', 'Bombón Ouro Branco', 3.00, 5, true)
ON CONFLICT (id) DO NOTHING;

-- 5. Produtos
INSERT INTO products (
    id, category_id, name, name_en, name_es, description, description_en, description_es,
    price, promotional_price, is_promo_active, is_featured, is_bestseller, is_new, is_available, display_order
) VALUES
(
    'p1000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    'Açaí Monte do Seu Jeito',
    'Custom Acai Cup',
    'Açaí a Tu Gusto',
    'Açaí cremoso batido na receita especial da casa, com até 3 frutas, 3 complementos e 2 coberturas gratuitas.',
    'Creamy acai bowl served in a cup with up to 3 fruits, 3 toppings and 2 syrups included.',
    'Açaí cremoso con hasta 3 frutas, 3 complementos y 2 coberturas incluidas.',
    16.00,
    14.00,
    true,
    true,
    true,
    false,
    true,
    1
),
(
    'p1000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'Copo Sensação de Morango',
    'Strawberry Sensation Cup',
    'Vaso Sensación de Fresa',
    'Camadas alternadas de açaí, morango fresco picado, leite condensado e raspas de chocolate meio amargo.',
    'Layers of rich acai, fresh chopped strawberries, sweet condensed milk and dark chocolate shavings.',
    'Capas de açaí, fresa fresca picada, leche condensada y virutas de chocolate semiamargo.',
    22.00,
    NULL,
    false,
    true,
    true,
    false,
    true,
    2
),
(
    'p1000000-0000-0000-0000-000000000003',
    'c1000000-0000-0000-0000-000000000002',
    'Tigela Daiane Suprema (600ml)',
    'Daiane Supreme Bowl (600ml)',
    'Bowl Daiane Suprema (600ml)',
    'A combinação perfeita: açaí cremoso coberto com creme de ninho trufado, banana, morango, kiwi e Nutella pura.',
    'The house signature bowl with acai, rich powdered milk cream, fresh banana, strawberry, kiwi and pure Nutella.',
    'La combinación estrella: açaí cremoso cubierto de crema de ninho trufada, plátano, fresa, kiwi y Nutella.',
    28.90,
    25.90,
    true,
    true,
    true,
    true,
    true,
    1
),
(
    'p1000000-0000-0000-0000-000000000004',
    'c1000000-0000-0000-0000-000000000002',
    'Tigela Fitness Granola Real (500ml)',
    'Fitness Bowl Real Granola (500ml)',
    'Bowl Fitness Granola Real (500ml)',
    'Açaí batido sem xarope artificial, servido com banana, morango, granola artesanal e mel puro de florada silvestre.',
    'Pure acai without added artificial syrup, served with banana, strawberry, artisan granola and organic wildflower honey.',
    'Açaí puro sin jarabes artificiales, servido con plátano, fresa, granola artesanal y miel pura.',
    24.00,
    NULL,
    false,
    false,
    false,
    false,
    true,
    2
),
(
    'p1000000-0000-0000-0000-000000000005',
    'c1000000-0000-0000-0000-000000000003',
    'Barca Família Açaí Daiane (1,2kg)',
    'Family Acai Boat (1.2kg)',
    'Barca Familiar Açaí Daiane (1.2kg)',
    'Nossa clássica barca para 3 a 4 pessoas, com açaí ultra cremoso, 4 frutas, 4 complementos e 2 adicionais premium.',
    'Grand acai boat ideal for 3-4 people, packed with acai, 4 fruits, 4 toppings and 2 premium inclusions.',
    'Gran barca ideal para 3-4 personas, repleta de açaí cremoso, 4 frutas, 4 complementos y 2 premium.',
    58.00,
    NULL,
    false,
    true,
    true,
    false,
    true,
    1
),
(
    'p1000000-0000-0000-0000-000000000006',
    'c1000000-0000-0000-0000-000000000004',
    'Shake de Açaí com Morango (400ml)',
    'Acai Strawberry Shake (400ml)',
    'Batido de Açaí con Fresa (400ml)',
    'Batido super cremoso com polpa de açaí premium, morangos e leite integral bem gelado.',
    'Ultra-creamy milkshake made with premium acai pulp, fresh strawberries and chilled whole milk.',
    'Batido súper cremoso con pulpa de açaí premium, fresas frescas y leche entera bien fría.',
    15.00,
    NULL,
    false,
    false,
    false,
    true,
    true,
    1
),
(
    'p1000000-0000-0000-0000-000000000007',
    'c1000000-0000-0000-0000-000000000004',
    'Água Mineral com Gás (500ml)',
    'Sparkling Mineral Water (500ml)',
    'Agua Mineral con Gas (500ml)',
    'Garrafa gelada 500ml.',
    'Chilled 500ml bottle.',
    'Botella fría de 500ml.',
    5.00,
    NULL,
    false,
    false,
    false,
    false,
    true,
    2
)
ON CONFLICT (id) DO NOTHING;

-- 6. Associação de Produtos com Grupos de Opções
-- Copos e Tigelas recebem grupos de opções
INSERT INTO product_option_groups (product_id, option_group_id, display_order) VALUES
('p1000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000001', 1),
('p1000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000002', 2),
('p1000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000003', 3),
('p1000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000004', 4),
('p1000000-0000-0000-0000-000000000001', 'g1000000-0000-0000-0000-000000000005', 5),

('p1000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000001', 1),
('p1000000-0000-0000-0000-000000000002', 'g1000000-0000-0000-0000-000000000005', 2),

('p1000000-0000-0000-0000-000000000003', 'g1000000-0000-0000-0000-000000000005', 1),

('p1000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000002', 1),
('p1000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000003', 2),
('p1000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000004', 3),
('p1000000-0000-0000-0000-000000000005', 'g1000000-0000-0000-0000-000000000005', 4)
ON CONFLICT DO NOTHING;

-- 7. Bairros e Taxas de Entrega (Recife & Olinda)
INSERT INTO neighborhoods (id, name, delivery_fee, min_order_amount, free_delivery_threshold, is_active, display_order) VALUES
-- Recife
('b1000000-0000-0000-0000-000000000001', 'Boa Viagem (Recife)', 5.00, 20.00, 50.00, true, 1),
('b1000000-0000-0000-0000-000000000002', 'Pina (Recife)', 6.00, 20.00, 55.00, true, 2),
('b1000000-0000-0000-0000-000000000003', 'Setúbal (Recife)', 5.00, 20.00, 50.00, true, 3),
('b1000000-0000-0000-0000-000000000004', 'Imbiribeira (Recife)', 7.00, 25.00, 65.00, true, 4),
('b1000000-0000-0000-0000-000000000005', 'Ipsep (Recife)', 7.50, 25.00, 70.00, true, 5),
('b1000000-0000-0000-0000-000000000006', 'Ibura (Recife)', 8.50, 25.00, 75.00, true, 6),
('b1000000-0000-0000-0000-000000000007', 'Graças (Recife)', 9.00, 30.00, 80.00, true, 7),
('b1000000-0000-0000-0000-000000000008', 'Espinheiro (Recife)', 9.00, 30.00, 80.00, true, 8),
('b1000000-0000-0000-0000-000000000009', 'Madalena (Recife)', 8.50, 25.00, 75.00, true, 9),
('b1000000-0000-0000-0000-000000000010', 'Torre (Recife)', 8.50, 30.00, 80.00, true, 10),
('b1000000-0000-0000-0000-000000000011', 'Casa Forte (Recife)', 10.00, 35.00, 90.00, true, 11),
('b1000000-0000-0000-0000-000000000012', 'Jaqueira (Recife)', 10.00, 35.00, 90.00, true, 12),
('b1000000-0000-0000-0000-000000000013', 'Parnamirim (Recife)', 10.00, 35.00, 90.00, true, 13),
('b1000000-0000-0000-0000-000000000014', 'Derby (Recife)', 8.00, 25.00, 75.00, true, 14),
('b1000000-0000-0000-0000-000000000015', 'Boa Vista (Recife)', 8.00, 25.00, 75.00, true, 15),
('b1000000-0000-0000-0000-000000000016', 'Cordeiro (Recife)', 9.00, 30.00, 85.00, true, 16),
('b1000000-0000-0000-0000-000000000017', 'Afogados (Recife)', 8.00, 25.00, 75.00, true, 17),
('b1000000-0000-0000-0000-000000000018', 'Várzea (Recife)', 12.00, 40.00, 100.00, true, 18),
-- Olinda
('b1000000-0000-0000-0000-000000000019', 'Bairro Novo (Olinda)', 12.00, 40.00, 110.00, true, 19),
('b1000000-0000-0000-0000-000000000020', 'Casa Caiada (Olinda)', 13.00, 45.00, 120.00, true, 20),
('b1000000-0000-0000-0000-000000000021', 'Carmo / Sítio Histórico (Olinda)', 12.00, 40.00, 110.00, true, 21),
('b1000000-0000-0000-0000-000000000022', 'Rio Doce (Olinda)', 15.00, 50.00, 130.00, true, 22),
('b1000000-0000-0000-0000-000000000023', 'Jardim Atlântico (Olinda)', 14.00, 45.00, 120.00, true, 23),
('b1000000-0000-0000-0000-000000000024', 'Salgadinho (Olinda)', 11.00, 35.00, 100.00, true, 24),
('b1000000-0000-0000-0000-000000000025', 'Amparo (Olinda)', 12.00, 40.00, 110.00, true, 25),
('b1000000-0000-0000-0000-000000000026', 'Peixinhos (Olinda)', 11.00, 35.00, 100.00, true, 26),
-- Jaboatão
('b1000000-0000-0000-0000-000000000027', 'Piedade (Jaboatão)', 8.00, 25.00, 75.00, true, 27),
('b1000000-0000-0000-0000-000000000028', 'Candeias (Jaboatão)', 9.00, 30.00, 80.00, true, 28)
ON CONFLICT (id) DO NOTHING;

-- 8. Horários de Funcionamento (Segunda a Domingo)
INSERT INTO business_hours (day_of_week, open_time, close_time, is_closed, label) VALUES
(0, '13:00', '23:00', false, 'Domingo'),
(1, '13:00', '22:30', false, 'Segunda-feira'),
(2, '13:00', '22:30', false, 'Terça-feira'),
(3, '13:00', '22:30', false, 'Quarta-feira'),
(4, '13:00', '22:30', false, 'Quinta-feira'),
(5, '13:00', '23:30', false, 'Sexta-feira'),
(6, '13:00', '23:30', false, 'Sábado')
ON CONFLICT DO NOTHING;

-- 9. Cupons de Teste / Exemplo
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active) VALUES
('DAIANE10', 'percentage', 10.00, 25.00, 100, 3, true),
('PRIMEIRACOMPRA', 'fixed', 5.00, 20.00, 50, 2, true)
ON CONFLICT (code) DO NOTHING;
