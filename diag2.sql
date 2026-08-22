SELECT 
  (SELECT COUNT(*) FROM warehouses) AS w_tot,
  (SELECT COUNT(*) FROM warehouses WHERE active = true) AS w_act,
  (SELECT COUNT(*) FROM products) AS p_tot,
  (SELECT COUNT(*) FROM products WHERE active = true) AS p_act,
  (SELECT COUNT(*) FROM inventory_batches) AS b_tot,
  (SELECT COUNT(*) FROM inventory_batches WHERE active = true) AS b_act;
