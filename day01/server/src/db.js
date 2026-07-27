import pg from 'pg';
import bcrypt from 'bcryptjs';

const {Pool}=pg;
export const pool=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME||'postgres',user:process.env.DB_USER,password:process.env.DB_PASSWORD,max:10,idleTimeoutMillis:30000,connectionTimeoutMillis:10000});

const schemaSql=`
CREATE SCHEMA IF NOT EXISTS zufang;
CREATE TABLE IF NOT EXISTS zufang.admins (
  id BIGSERIAL PRIMARY KEY, username VARCHAR(80) UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS zufang.listings (
  id BIGSERIAL PRIMARY KEY, title VARCHAR(160) UNIQUE NOT NULL, rent_type VARCHAR(20) NOT NULL CHECK (rent_type IN ('整租','合租')),
  district VARCHAR(80) NOT NULL, subway VARCHAR(160) NOT NULL, price INTEGER NOT NULL CHECK(price>=0), layout VARCHAR(40) NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1, area NUMERIC(8,2) NOT NULL, floor VARCHAR(40) NOT NULL, tags JSONB NOT NULL DEFAULT '[]', image_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', rating NUMERIC(2,1) NOT NULL DEFAULT 5, review_count INTEGER NOT NULL DEFAULT 0,
  landlord_name VARCHAR(80) NOT NULL, landlord_phone VARCHAR(30) NOT NULL, latitude NUMERIC(10,6), longitude NUMERIC(10,6),
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK(status IN ('published','offline')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS zufang.favorites (
  id BIGSERIAL PRIMARY KEY, client_id VARCHAR(100) NOT NULL, listing_id BIGINT NOT NULL REFERENCES zufang.listings(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(client_id,listing_id)
);
CREATE TABLE IF NOT EXISTS zufang.appointments (
  id BIGSERIAL PRIMARY KEY, listing_id BIGINT NOT NULL REFERENCES zufang.listings(id) ON DELETE CASCADE, client_id VARCHAR(100) NOT NULL,
  name VARCHAR(80) NOT NULL, phone VARCHAR(30) NOT NULL, visit_time TIMESTAMPTZ NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listings_status_idx ON zufang.listings(status);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON zufang.appointments(status);
`;

const seedListings=[
 ['阳光里精装两居室','整租','朝阳区','地铁10号线 劲松站 5分钟',6800,'2室1厅',2,78,'14/18层',['精装修','拎包入住','南北通透'],'/uploads/house-1.avif','房屋朝南，采光充足，精装修，家具家电齐全，周边生活设施便利，距地铁站步行5分钟，适合上班族居住。',4.8,23,'张先生','13800000001',39.8848,116.4612],
 ['万科金色领域大一居','整租','海淀区','地铁4号线 西苑站 8分钟',4500,'1室1厅',1,52,'7/24层',['品质小区','临近高校'],'/uploads/house-2.avif','品质社区一居室，园林环境优美，物业服务完善，交通和生活配套便利。',4.6,18,'李女士','13800000002',40.0024,116.2951],
 ['CBD核心三居豪装','整租','朝阳区','地铁1号线 国贸站 3分钟',14500,'3室2厅',3,130,'28/32层',['豪华装修','高层景观'],'/uploads/house-3.avif','CBD核心高层景观三居，品质装修，视野开阔，适合家庭与商务人士居住。',4.9,31,'王先生','13800000003',39.9094,116.4616],
 ['东城老城区胡同合租','合租','东城区','地铁2号线 鼓楼大街站 12分钟',2200,'单间',1,18,'1/2层',['胡同文化','北京特色'],'/uploads/house-4.avif','老北京胡同里的安静单间，室友友好，公共区域整洁，体验地道城市生活。',4.3,12,'周女士','13800000004',39.9487,116.3932],
 ['望京SOHO精品公寓','整租','朝阳区','地铁14号线 望京站 6分钟',7200,'1室1厅',1,65,'19/42层',['科技园区','韩国城'],'/uploads/house-5.avif','望京核心区精品公寓，通勤便利，商业配套成熟，现代化装修。',4.7,26,'陈先生','13800000005',39.9965,116.4801],
 ['五道口学区两居室','整租','海淀区','地铁13号线 五道口站 4分钟',8900,'2室1厅',2,89,'5/6层',['学区房','安静小区'],'/uploads/house-6.avif','五道口安静两居，采光好，近地铁与高校，社区成熟，适合家庭居住。',4.5,20,'赵女士','13800000006',39.9928,116.3376]
];

export async function initializeDatabase(){
 await pool.query(schemaSql);
 const passwordHash=await bcrypt.hash(process.env.ADMIN_PASSWORD||'admin123',10);
 await pool.query(`INSERT INTO zufang.admins(username,password_hash) VALUES($1,$2) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash`,[process.env.ADMIN_USERNAME||'admin',passwordHash]);
 const sql=`INSERT INTO zufang.listings(title,rent_type,district,subway,price,layout,rooms,area,floor,tags,image_url,description,rating,review_count,landlord_name,landlord_phone,latitude,longitude)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT(title) DO NOTHING`;
 for(const row of seedListings) await pool.query(sql,[...row.slice(0,9),JSON.stringify(row[9]),...row.slice(10)]);
}
