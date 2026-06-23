CREATE OR REPLACE FUNCTION public.procesar_compra_ue_clp(p_usuario_id uuid, p_cantidad_ue numeric)
RETURNS TABLE(ok boolean, mensaje text)
LANGUAGE plpgsql SECURITY DEFINER AS $func$
DECLARE
  v_saldo_clp NUMERIC;
  v_nav NUMERIC;
  v_fx_rate NUMERIC;
  v_spread NUMERIC;
  v_monto_clp NUMERIC;
  v_monto_usd NUMERIC;
  v_new_total_ues NUMERIC;
  v_precio_mercado NUMERIC;
  v_chile_now timestamptz := (NOW() AT TIME ZONE 'America/Santiago')::timestamptz;
BEGIN
  IF p_usuario_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Usuario no valido'::TEXT; RETURN;
  END IF;
  IF p_cantidad_ue IS NULL OR p_cantidad_ue <= 0 THEN
    RETURN QUERY SELECT FALSE, 'La cantidad debe ser mayor a cero'::TEXT; RETURN;
  END IF;

  SELECT COALESCE(saldo_clp, 0) INTO v_saldo_clp FROM usuarios WHERE id = p_usuario_id;

  SELECT COALESCE(
    (SELECT precio_mercado FROM precio_mercado_ue ORDER BY fecha DESC LIMIT 1),
    (SELECT nav FROM nav_historico WHERE nav > 0 ORDER BY fecha DESC LIMIT 1), 1000
  ) INTO v_nav;
  IF v_nav IS NULL OR v_nav <= 0 THEN v_nav := 1000; END IF;

  SELECT COALESCE(manual_rate, 950), COALESCE(spread_pct, 0.02)
  INTO v_fx_rate, v_spread
  FROM fx_config WHERE is_active = true LIMIT 1;
  IF v_fx_rate IS NULL OR v_fx_rate <= 0 THEN v_fx_rate := 950; END IF;

  v_monto_usd := p_cantidad_ue * v_nav;
  v_monto_clp := v_monto_usd * v_fx_rate * (1 + v_spread);

  IF v_saldo_clp < v_monto_clp THEN
    RETURN QUERY SELECT FALSE, ('Saldo CLP insuficiente. Necesitas $' || ROUND(v_monto_clp, 0) || ' CLP. Tu saldo: $' || ROUND(v_saldo_clp, 0) || ' CLP.')::TEXT;
    RETURN;
  END IF;

  UPDATE usuarios SET saldo_clp = saldo_clp - v_monto_clp WHERE id = p_usuario_id;

  INSERT INTO ordenes_ue (id, usuario_id, tipo, cantidad_total, cantidad_restante, precio_nav, estado, fecha_creacion, fecha_actualizacion)
  VALUES (gen_random_uuid(), p_usuario_id, 'compra', p_cantidad_ue, p_cantidad_ue, v_nav, 'pendiente', v_chile_now, v_chile_now);

  INSERT INTO user_cartera (id, usuario_id, ue_totales, valor_invertido, fecha_creacion, fecha_actualizacion)
  VALUES (gen_random_uuid(), p_usuario_id, p_cantidad_ue, v_monto_usd, v_chile_now, v_chile_now)
  ON CONFLICT (usuario_id) DO UPDATE SET
    ue_totales = user_cartera.ue_totales + p_cantidad_ue,
    valor_invertido = user_cartera.valor_invertido + v_monto_usd,
    fecha_actualizacion = v_chile_now;

  INSERT INTO transacciones_billetera (id, usuario_id, tipo, cantidad_ue, monto_usd, nav_ue, monto_clp, fecha, estado)
  VALUES (gen_random_uuid(), p_usuario_id, 'compra', p_cantidad_ue, v_monto_usd, v_nav, v_monto_clp, v_chile_now, 'completado');

  INSERT INTO volumen_historico (id, fecha, volumen_compras, cantidad_comprada, precio_promedio, nav_en_momento)
  VALUES (gen_random_uuid(), v_chile_now, v_monto_usd, p_cantidad_ue, v_nav, v_nav);

  SELECT COALESCE(SUM(ue_totales), 0) INTO v_new_total_ues FROM user_cartera;
  PERFORM calcular_precio_mercado();

  SELECT COALESCE(precio_mercado, v_nav) INTO v_precio_mercado
  FROM precio_mercado_ue ORDER BY fecha DESC LIMIT 1;

  INSERT INTO nav_historico (id, fecha, nav, capital_total, total_ues, nav_mercado, volumen_neto)
  VALUES (gen_random_uuid(), v_chile_now, v_precio_mercado,
    (SELECT COALESCE(SUM(valor_actual), 0) FROM cartera) + v_monto_usd,
    v_new_total_ues, v_precio_mercado,
    (SELECT volumen_neto FROM precio_mercado_ue ORDER BY fecha DESC LIMIT 1));

  RETURN QUERY SELECT TRUE, ('Compra CLP exitosa: ' || p_cantidad_ue || ' UEs a $' || ROUND(v_nav, 2) || ' USD. Pagaste $' || ROUND(v_monto_clp, 0) || ' CLP (tc=' || ROUND(v_fx_rate, 0) || ', spread=' || ROUND(v_spread * 100, 2) || '%).')::TEXT;
END;
$func$;

GRANT ALL ON FUNCTION public.procesar_compra_ue_clp(uuid, numeric) TO anon, authenticated;
