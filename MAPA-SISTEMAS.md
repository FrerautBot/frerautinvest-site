# Mapa de Sistemas — Freraut Invest

## 1. Sistema de Valor UE (UE Value)

**Propósito:** Precio de la Unidad de Empresa (UE), el NAV.

| Capa | Ubicación | Detalle |
|------|-----------|---------|
| **DB (Supabase)** | `metricas_mercado.nav_actual` | NAV en USD. Actualizado por trigger/bot. |
| **DB (Supabase)** | `precio_actual_ue.precio_actual` | Precio UE actual calculado (= capital_total / total_ues). |
| **DB (Supabase)** | `fx_config.manual_rate` | Tipo de cambio manual USD/CLP. |
| **RPC** | `obtener_metricas_mercado()` | Retorna nav_actual, capital_total_invertido, ues_en_circulacion. |
| **UI** | `src/components/Market.jsx` | Líneas 663, 691, 702 — queries de precio y NAV. |
| **UI** | `src/components/Index.jsx` | Línea 69 — sobreescribe nav_actual con capital_total real. |
| **UI** | `src/components/PatrimonioChart.jsx` | Línea 87 — chart con dataKey="patrimonio_total_real". |
| **Legacy** | `Code.txt` función `getNavCLP()` | Lee NAV de hoja Config, retorna en CLP. |

**Flujo:** `metricas_mercado.nav_actual` (USD) → UI → formateo con `formatCurrency` (CLP) → **BUG: se etiqueta como CLP cuando es USD**.

---

## 2. Sistema de Circulación de UEs (UE Circulation)

**Propósito:** Compra, venta y transferencia de UEs entre usuarios.

| Capa | Ubicación | Detalle |
|------|-----------|---------|
| **DB** | `unidades_usuario` | Tenencias de UEs por usuario. |
| **DB** | `usuarios.saldo_clp` | Saldo disponible en CLP para comprar UEs. |
| **DB** | `usuarios.saldo_usd` | Saldo disponible en USD. |
| **RPC** | `procesar_compra_ue_con_ajuste(p_usuario_id, p_cantidad)` | Compra de UEs con lógica de ajuste. |
| **RPC** | `procesar_venta_ue_con_ajuste(p_usuario_id, p_cantidad)` | Venta de UEs con lógica de ajuste. |
| **RPC** | `cotizar_cambio_clp_usd(p_usuario_id, p_monto_clp)` | Cotización para cambio CLP→USD. |
| **RPC** | `convertir_clp_a_usd(p_usuario_id, p_monto_clp)` | Ejecuta cambio CLP→USD. |
| **RPC** | `solicitar_retiro(p_usuario_id, p_monto_clp, ...)` | Retiro de fondos. |
| **UI** | `src/components/Market.jsx` | Líneas 777-808 — compra/venta. |
| **UI** | `src/components/MyUnits.jsx` | Líneas 552, 630, 660 — retiros y cambios. |
| **UI** | `src/components/OfertasUEs.jsx` | Líneas 46-59, 199 — ofertas de UEs. |
| **Legacy** | `Code.txt` funciones `comprarAcciones()`, `venderAcciones()` | Mercado híbrido FIFO, todo en CLP. |

**Flujo:** Todas las transacciones en CLP o USD. La DB maneja las conversiones en los RPCs del lado servidor.

---

## 3. Sistema de Valor Empresa (Company Value)

**Propósito:** Valor total de la cartera de inversiones de la empresa.

| Capa | Ubicación | Detalle |
|------|-----------|---------|
| **DB** | `parametros_fondo.valor_base_clp` | Valor base del fondo en CLP. |
| **DB** | `activos_cartera_fondo` | Activos de la cartera (en USD). |
| **RPC** | `obtener_capital_total_historico(p_dias)` | Historial del capital total. |
| **RPC** | `actualizar_valor_base(p_valor_base_clp)` | Actualiza valor base. |
| **UI** | `src/components/Crecimiento.jsx` | Líneas 586-675 — gestión de crecimiento. |
| **UI** | `src/components/Pool.jsx` | Pool de inversión (todo USD). |
| **UI** | `src/components/Portfolio.jsx` | Portafolio de activos financieros. |
| **UI** | `src/components/MarketDashboard.jsx` | Dashboard de mercado. |

---

## 4. Sistema de Patrimonio (Equity/Net Worth) — AFECTADO POR BUG

**Propósito:** Calcular y mostrar el patrimonio total de cada usuario.

| Capa | Ubicación | Detalle |
|------|-----------|---------|
| **DB (VIEW)** | `vista_patrimonio_usuario` | **CRÍTICO: vista SQL con cálculo incorrecto**. Suma saldo_clp (CLP) + valor_total_ues (cifra que representa USD) sin convertir. Ignora saldo_usd. |
| **RPC** | `obtener_historial_patrimonio(p_usuario_id, p_dias)` | **CRÍTICO: función con cálculo incorrecto**. Retorna patrimonio_total_real con el mismo error. |
| **RPC** | `obtener_lucro_detallado(p_usuario_id)` | Retorna valor_actual (UEs en USD), total_invertido, lucro_total. |
| **UI** | `src/components/Index.jsx` | Líneas 248-256 — tarjeta "Patrimonio Total". Usa formato CLP. |
| **UI** | `src/components/MyUnits.jsx` | Líneas 105-107, 145, 161, 163, 178 — tarjetas "Patrimonio Actual" y "Patrimonio en CLP". |
| **UI** | `src/components/PatrimonioChart.jsx` | Chart de evolución. Usa patrimonio_total_real. |

---

## ROOT CAUSE — Bug de mezcla CLP/USD

### El problema

La vista `vista_patrimonio_usuario` en Supabase calcula:

```sql
patrimonio_total = saldo_clp + valor_total_ues
```

Donde:
- `saldo_clp` = 500,000 **CLP** (ej. usuario valdeslukas5)
- `valor_total_ues` = 50,000 **número que representa USD** (10,000 UEs × $5 USD/UE)
- `saldo_usd` = 1,000 **USD** — **NO INCLUIDO en la suma**

Resultado incorrecto: `500,000 CLP + 50,000 (tratado como CLP) = 550,000`
→ La UI muestra `formatUSD(550000)` = **"$550,000.00 USD"** (error: debiera ser $51,526)

### El cálculo correcto

```
patrimonioUSD = saldo_usd + valorUEs_USD + (saldo_clp / fxRate)
              = 1,000 + 50,000 + (500,000 / 950)
              = $51,526 USD ✓

patrimonioCLP = saldo_clp + (valorUEs_USD × fxRate) + (saldo_usd × fxRate)
              = 500,000 + (50,000 × 950) + (1,000 × 950)
              = $48,950,000 CLP ✓
```

### Archivos con bug

| Archivo | Líneas | Bug |
|---------|--------|-----|
| `vista_patrimonio_usuario` (DB) | — | Suma CLP + USD sin convertir. Omite saldo_usd. |
| `obtener_historial_patrimonio` (DB) | — | Mismo error que la vista. |
| `src/components/Index.jsx` | 108-113, 164-170 | formatCurrency etiqueta USD como CLP. |
| `src/components/MyUnits.jsx` | 44, 99-101 | Usa RPC con datos incorrectos para el chart. |
| `src/components/PatrimonioChart.jsx` | 16-22, 87 | Formatea CLP sobre datos de moneda desconocida. |
| `src/components/MarketDashboard.jsx` | 9 | fC formatea como CLP valores que son USD. |

### Fix aplicado (frontend)

En `MyUnits.jsx` y `Index.jsx` ya se agregó el cálculo correcto que lee `saldo_usd`, `saldo_clp`, y `lucro.valor_actual` por separado y calcula el patrimonio correctamente.

**Los cambios están en archivos locales pero NO en producción.** Para aplicar: `npm run build` + deploy.

### Fix permanente (DB)

Para arreglar la raíz, la vista `vista_patrimonio_usuario` y la RPC `obtener_historial_patrimonio` deben actualizarse en Supabase con el cálculo correcto.

---

## Testing — Cómo probar incrementalmente

1. `npm run build` — compila el bundle
2. `npx vite preview --port 3000` — servidor local con el build
3. Abrir `http://localhost:3000` y verificar:
   - Index: tarjeta "Patrimonio Total" debe mostrar ~$48,950,000 CLP
   - MyUnits: tarjetas "Patrimonio Actual" debe mostrar ~$51,526 USD y CLP ~$48,950,000
4. Si todo OK, desplegar con `node deploy-hostinger.cjs`
