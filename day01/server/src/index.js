import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {fileURLToPath} from 'url';
import path from 'path';
import {initializeDatabase,pool} from './db.js';
import {buildListingFilters,pickListing} from './helpers.js';

const app=express();const port=Number(process.env.PORT||3000);const dirname=path.dirname(fileURLToPath(import.meta.url));
const allowed=(process.env.CORS_ORIGINS||'').split(',').filter(Boolean);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));app.use(cors({origin(origin,callback){if(!origin||!allowed.length||allowed.includes(origin))return callback(null,true);callback(new Error('不允许的来源'))}}));app.use(express.json({limit:'1mb'}));app.use(morgan(process.env.NODE_ENV==='production'?'combined':'dev'));app.use('/uploads',express.static(path.resolve(dirname,'../uploads'),{maxAge:'7d'}));

const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const clientId=req=>String(req.get('X-Client-Id')||'anonymous').slice(0,100);
const auth=(req,res,next)=>{try{const raw=req.get('Authorization')||'';req.admin=jwt.verify(raw.replace(/^Bearer /,''),process.env.JWT_SECRET);next()}catch{return res.status(401).json({message:'登录已过期，请重新登录'})}};

app.get('/health',asyncRoute(async(_req,res)=>{await pool.query('SELECT 1');res.json({ok:true,service:'zufang-api'})}));
app.get('/api/listings',asyncRoute(async(req,res)=>{const {where,values}=buildListingFilters(req.query);const result=await pool.query(`SELECT * FROM zufang.listings WHERE ${where} ORDER BY created_at,id`,values);res.json({data:result.rows})}));
app.get('/api/listings/:id',asyncRoute(async(req,res)=>{const result=await pool.query(`SELECT * FROM zufang.listings WHERE id=$1 AND status='published'`,[req.params.id]);if(!result.rowCount)return res.status(404).json({message:'房源不存在'});res.json({data:result.rows[0]})}));
app.get('/api/favorites',asyncRoute(async(req,res)=>{const result=await pool.query(`SELECT l.* FROM zufang.favorites f JOIN zufang.listings l ON l.id=f.listing_id WHERE f.client_id=$1 AND l.status='published' ORDER BY f.created_at DESC`,[clientId(req)]);res.json({data:result.rows})}));
app.post('/api/favorites/:listingId',asyncRoute(async(req,res)=>{await pool.query(`INSERT INTO zufang.favorites(client_id,listing_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[clientId(req),req.params.listingId]);res.status(201).json({favorite:true})}));
app.delete('/api/favorites/:listingId',asyncRoute(async(req,res)=>{await pool.query(`DELETE FROM zufang.favorites WHERE client_id=$1 AND listing_id=$2`,[clientId(req),req.params.listingId]);res.json({favorite:false})}));
app.post('/api/appointments',asyncRoute(async(req,res)=>{const {listingId,name,phone,visitTime}=req.body;if(!listingId||!name||!/^1[3-9]\d{9}$/.test(phone||'')||!visitTime)return res.status(400).json({message:'请填写完整且有效的预约信息'});const result=await pool.query(`INSERT INTO zufang.appointments(listing_id,client_id,name,phone,visit_time) VALUES($1,$2,$3,$4,$5) RETURNING *`,[listingId,clientId(req),String(name).slice(0,80),phone,visitTime]);res.status(201).json({data:result.rows[0]})}));

app.post('/api/admin/login',asyncRoute(async(req,res)=>{const {username,password}=req.body;const result=await pool.query(`SELECT * FROM zufang.admins WHERE username=$1`,[username]);const user=result.rows[0];if(!user||!await bcrypt.compare(password||'',user.password_hash))return res.status(401).json({message:'账号或密码错误'});res.json({token:jwt.sign({id:user.id,username:user.username},process.env.JWT_SECRET,{expiresIn:'12h'})})}));
app.use('/api/admin',auth);
app.get('/api/admin/dashboard',asyncRoute(async(_req,res)=>{const [listings,appointments,recent]=await Promise.all([pool.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='published')::int AS published FROM zufang.listings`),pool.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='pending')::int AS pending FROM zufang.appointments`),pool.query(`SELECT a.*,l.title listing_title FROM zufang.appointments a JOIN zufang.listings l ON l.id=a.listing_id ORDER BY a.created_at DESC LIMIT 6`)]);res.json({data:{listingCount:listings.rows[0].total,publishedCount:listings.rows[0].published,appointmentCount:appointments.rows[0].total,pendingCount:appointments.rows[0].pending,recentAppointments:recent.rows}})}));
app.get('/api/admin/listings',asyncRoute(async(_req,res)=>{const result=await pool.query(`SELECT * FROM zufang.listings ORDER BY created_at DESC,id DESC`);res.json({data:result.rows})}));
const listingColumns='title,rent_type,district,subway,price,layout,rooms,area,floor,tags,image_url,description,rating,review_count,landlord_name,landlord_phone,latitude,longitude,status';
const listingSql=`title=$1,rent_type=$2,district=$3,subway=$4,price=$5,layout=$6,rooms=$7,area=$8,floor=$9,tags=$10::jsonb,image_url=$11,description=$12,rating=$13,review_count=$14,landlord_name=$15,landlord_phone=$16,latitude=$17,longitude=$18,status=$19`;
const listingValues=b=>{const x=pickListing(b);return[x.title,x.rentType,x.district,x.subway,x.price,x.layout,x.rooms,x.area,x.floor,JSON.stringify(x.tags),x.imageUrl,x.description,x.rating,x.reviewCount,x.landlordName,x.landlordPhone,x.latitude,x.longitude,x.status]};
app.post('/api/admin/listings',asyncRoute(async(req,res)=>{const values=listingValues(req.body);if(!values[0]||!values[2]||!values[3]||!values[10])return res.status(400).json({message:'请填写完整的房源信息'});const placeholders=values.map((_,i)=>i===9?`$${i+1}::jsonb`:`$${i+1}`).join(',');const result=await pool.query(`INSERT INTO zufang.listings(${listingColumns}) VALUES(${placeholders}) RETURNING *`,values);res.status(201).json({data:result.rows[0]})}));
app.put('/api/admin/listings/:id',asyncRoute(async(req,res)=>{const values=listingValues(req.body);values.push(req.params.id);const result=await pool.query(`UPDATE zufang.listings SET ${listingSql},updated_at=NOW() WHERE id=$20 RETURNING *`,values);if(!result.rowCount)return res.status(404).json({message:'房源不存在'});res.json({data:result.rows[0]})}));
app.delete('/api/admin/listings/:id',asyncRoute(async(req,res)=>{const result=await pool.query(`DELETE FROM zufang.listings WHERE id=$1 RETURNING id`,[req.params.id]);if(!result.rowCount)return res.status(404).json({message:'房源不存在'});res.json({ok:true})}));
app.get('/api/admin/appointments',asyncRoute(async(_req,res)=>{const result=await pool.query(`SELECT a.*,l.title listing_title FROM zufang.appointments a JOIN zufang.listings l ON l.id=a.listing_id ORDER BY a.created_at DESC`);res.json({data:result.rows})}));
app.put('/api/admin/appointments/:id',asyncRoute(async(req,res)=>{if(!['pending','confirmed','completed','cancelled'].includes(req.body.status))return res.status(400).json({message:'无效的预约状态'});const result=await pool.query(`UPDATE zufang.appointments SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *`,[req.body.status,req.params.id]);if(!result.rowCount)return res.status(404).json({message:'预约不存在'});res.json({data:result.rows[0]})}));

app.use((err,_req,res,_next)=>{console.error(err);if(err.code==='23505')return res.status(409).json({message:'数据已存在，请勿重复提交'});if(err.code==='23503')return res.status(400).json({message:'关联的数据不存在'});res.status(500).json({message:process.env.NODE_ENV==='production'?'服务暂时不可用':err.message})});

initializeDatabase().then(()=>app.listen(port,'0.0.0.0',()=>console.log(`Zufang API running on ${port}`))).catch(error=>{console.error('Database initialization failed',error);process.exitCode=1});
