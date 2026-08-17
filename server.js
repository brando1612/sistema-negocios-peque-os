const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./src/db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: "Nombre, correo y contraseña de mínimo 6 caracteres son obligatorios." });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (name,email,password,role) VALUES (?,?,?,'admin')")
      .run(name.trim(), email.trim().toLowerCase(), hash);
    const user = db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(result.lastInsertRowid);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "8h" });
    res.status(201).json({ token, user });
  } catch {
    res.status(409).json({ error: "El correo ya está registrado." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.password))
    return res.status(401).json({ error: "Correo o contraseña incorrectos." });
  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ token: jwt.sign(safe, JWT_SECRET, { expiresIn: "8h" }), user: safe });
});

app.get("/api/dashboard", auth, (req, res) => {
  const products = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  const clients = db.prepare("SELECT COUNT(*) c FROM clients").get().c;
  const sales = db.prepare("SELECT COUNT(*) c FROM sales").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) total FROM sales").get().total;
  res.json({ products, clients, sales, revenue });
});

app.get("/api/products", auth, (req,res) => res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all()));
app.post("/api/products", auth, (req,res) => {
  const { name, type="Producto", price=0, stock=0 } = req.body;
  if (!name) return res.status(400).json({error:"El nombre es obligatorio."});
  const r = db.prepare("INSERT INTO products(name,type,price,stock) VALUES(?,?,?,?)").run(name,type,Number(price),Number(stock));
  res.status(201).json(db.prepare("SELECT * FROM products WHERE id=?").get(r.lastInsertRowid));
});
app.put("/api/products/:id", auth, (req,res) => {
  const { name, type, price, stock } = req.body;
  db.prepare("UPDATE products SET name=?,type=?,price=?,stock=? WHERE id=?").run(name,type,Number(price),Number(stock),req.params.id);
  res.json(db.prepare("SELECT * FROM products WHERE id=?").get(req.params.id));
});
app.delete("/api/products/:id", auth, (req,res) => {
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.status(204).end();
});

app.get("/api/clients", auth, (req,res) => res.json(db.prepare("SELECT * FROM clients ORDER BY id DESC").all()));
app.post("/api/clients", auth, (req,res) => {
  const { name, email="", phone="" } = req.body;
  if (!name) return res.status(400).json({error:"El nombre es obligatorio."});
  const r = db.prepare("INSERT INTO clients(name,email,phone) VALUES(?,?,?)").run(name,email,phone);
  res.status(201).json(db.prepare("SELECT * FROM clients WHERE id=?").get(r.lastInsertRowid));
});
app.put("/api/clients/:id", auth, (req,res) => {
  const { name,email,phone } = req.body;
  db.prepare("UPDATE clients SET name=?,email=?,phone=? WHERE id=?").run(name,email,phone,req.params.id);
  res.json(db.prepare("SELECT * FROM clients WHERE id=?").get(req.params.id));
});
app.delete("/api/clients/:id", auth, (req,res) => {
  db.prepare("DELETE FROM clients WHERE id=?").run(req.params.id);
  res.status(204).end();
});

app.get("/api/sales", auth, (req,res) => {
  res.json(db.prepare(`SELECT s.*, c.name client_name
    FROM sales s LEFT JOIN clients c ON c.id=s.client_id ORDER BY s.id DESC`).all());
});

app.post("/api/sales", auth, (req,res) => {
  const { client_id=null, product_id, quantity=1, payment_method="Efectivo" } = req.body;
  const product = db.prepare("SELECT * FROM products WHERE id=?").get(product_id);
  if (!product) return res.status(404).json({error:"Producto no encontrado."});
  const qty = Number(quantity);
  if (qty <= 0 || product.stock < qty) return res.status(400).json({error:"Stock insuficiente."});
  const total = product.price * qty;
  const tx = db.transaction(() => {
    const r = db.prepare("INSERT INTO sales(client_id,user_id,total,payment_method) VALUES(?,?,?,?)")
      .run(client_id || null, req.user.id, total, payment_method);
    db.prepare("INSERT INTO sale_items(sale_id,product_id,quantity,price) VALUES(?,?,?,?)")
      .run(r.lastInsertRowid, product.id, qty, product.price);
    db.prepare("UPDATE products SET stock=stock-? WHERE id=?").run(qty, product.id);
    return r.lastInsertRowid;
  });
  res.status(201).json(db.prepare("SELECT * FROM sales WHERE id=?").get(tx()));
});

app.get("/api/reports/monthly", auth, (req,res) => {
  res.json(db.prepare(`SELECT strftime('%Y-%m', created_at) month,
    COUNT(*) sales, ROUND(SUM(total),2) revenue
    FROM sales GROUP BY month ORDER BY month DESC LIMIT 12`).all());
});

app.get("/api/users", auth, (req,res) => {
  if (req.user.role !== "admin") return res.status(403).json({error:"Acceso denegado."});
  res.json(db.prepare("SELECT id,name,email,role,created_at FROM users ORDER BY id DESC").all());
});

app.get("*", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT, () => console.log(`Servidor iniciado: http://localhost:${PORT}`));
