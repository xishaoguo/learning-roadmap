import { useMemo, useState } from 'react';
import {
  ArrowLeft, Bath, BedDouble, Bell, CalendarDays, ChevronRight, CircleParking,
  Compass, FileText, Heart, HelpCircle, House, Mail, MapPin, MessageSquare,
  Search, Settings, Share2, SlidersHorizontal, Snowflake, Sparkles, Square,
  UserRound, WalletCards, Wifi, X,
} from 'lucide-react';

const exploreHomes = [
  { id: 'city-studio', image: '/assets/explore-1.jpg', title: '市中心现代单间', price: '1,200', location: '上海市，静安区', beds: 1, baths: 1, area: 45, type: '公寓', badge: '精选房源' },
  { id: 'family-home', image: '/assets/explore-2.jpg', title: '温馨三居室家庭住宅', price: '3,500', location: '北京市，朝阳区', beds: 3, baths: 2, area: 120, type: '住宅' },
  { id: 'urban-loft', image: '/assets/explore-3.jpg', title: '工业风时尚阁楼', price: '2,800', location: '深圳市，南山区', beds: 2, baths: 1, area: 85, type: '阁楼', badge: '新上架' },
];

const savedHomes = [
  { id: 'saved-1', image: '/assets/saved-1.jpg', title: '静安区 · 愚园路', subtitle: '极简风格两居室', price: '8,500', beds: '2室', area: '65m²', metro: '2号线', type: '公寓', badge: '精选' },
  { id: 'saved-2', image: '/assets/saved-2.jpg', title: '朝阳区 · 三里屯', subtitle: 'Loft 设计师公寓', price: '5,200', beds: '1室', area: '40m²', metro: '', type: '公寓' },
  { id: 'saved-3', image: '/assets/saved-3.jpg', title: '南山区 · 深圳湾', subtitle: '海景高层公寓 · 三居室', price: '12,000', beds: '3室', area: '128m²', metro: '', type: '整租', compact: true },
];

const navItems = [
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'saved', label: 'Saved', Icon: Heart },
  { id: 'messages', label: 'Messages', Icon: Mail },
  { id: 'profile', label: 'Profile', Icon: UserRound },
];

export default function App() {
  const [page, setPage] = useState('explore');
  const [previousPage, setPreviousPage] = useState('explore');
  const [category, setCategory] = useState('全部');
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState(() => new Set(['city-studio', ...savedHomes.map(item => item.id)]));
  const [toast, setToast] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  const go = (next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openDetail = () => { setPreviousPage(page); go('detail'); };
  const toggleLiked = (id) => {
    setLiked(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  return <div className="phone-shell">
    {page === 'explore' && <ExplorePage category={category} setCategory={setCategory} query={query} setQuery={setQuery} liked={liked} toggleLiked={toggleLiked} openDetail={openDetail} />}
    {page === 'saved' && <SavedPage liked={liked} toggleLiked={toggleLiked} openDetail={openDetail} />}
    {page === 'messages' && <MessagesPage />}
    {page === 'profile' && <ProfilePage showToast={showToast} />}
    {page === 'detail' && <DetailPage saved={liked.has('city-studio')} onBack={() => go(previousPage)} onSave={() => toggleLiked('city-studio')} onContact={() => setContactOpen(true)} />}
    {page !== 'detail' && <BottomNav active={page} onNavigate={go} />}
    {contactOpen && <ContactSheet onClose={() => setContactOpen(false)} onDone={() => { setContactOpen(false); showToast('已发送联系请求'); }} />}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function ExplorePage({ category, setCategory, query, setQuery, liked, toggleLiked, openDetail }) {
  const visible = useMemo(() => exploreHomes.filter(item =>
    (category === '全部' || item.type === category) &&
    (!query.trim() || `${item.title}${item.location}`.includes(query.trim())),
  ), [category, query]);
  return <>
    <TopBar title="HomeSeek" action={<Search size={21} />} />
    <main className="page explore-page">
      <div className="search-row">
        <label className="search-box"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索城市、社区..." /></label>
        <button className="filter-button" aria-label="筛选"><SlidersHorizontal size={19} /></button>
      </div>
      <div className="chips-row">
        {['全部', '公寓', '住宅', '单间', '阁楼'].map(item => <button key={item} className={category === item ? 'chip active' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <section className="explore-list">
        {visible.map((home, index) => <article className="property-card" key={home.id} onClick={index === 0 ? openDetail : undefined}>
          <div className="property-photo"><img src={home.image} alt={home.title} />
            <button className={liked.has(home.id) ? 'image-heart liked' : 'image-heart'} aria-label="收藏" onClick={event => { event.stopPropagation(); toggleLiked(home.id); }}><Heart size={21} fill={liked.has(home.id) ? 'currentColor' : 'none'} /></button>
            {home.badge && <span className="photo-badge">{home.badge}</span>}
          </div>
          <div className="property-content">
            <div className="card-title"><h2>{home.title}</h2><strong>¥{home.price}<small>/月</small></strong></div>
            <p className="location"><MapPin size={15} />{home.location}</p>
            <div className="property-facts"><span><BedDouble />{home.beds} 卧室</span><span><Bath />{home.baths} 浴室</span><span><Square />{home.area} ㎡</span></div>
          </div>
        </article>)}
        {!visible.length && <EmptyState icon={<Search />} title="没有找到房源" text="试试其他关键词或筛选条件" />}
      </section>
    </main>
  </>;
}

function SavedPage({ liked, toggleLiked, openDetail }) {
  const [filter, setFilter] = useState('全部房源');
  const items = savedHomes.filter(item => liked.has(item.id) && (filter === '全部房源' || item.type === filter));
  return <>
    <TopBar title="我的收藏" leading={<Search size={21} />} action={<SlidersHorizontal size={19} />} />
    <main className="page saved-page">
      <div className="chips-row saved-filters">{['全部房源', '公寓', '合租', '整租'].map(item => <button key={item} className={filter === item ? 'chip active' : 'chip'} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="saved-list">
        {items.map((home, index) => home.compact ? <article className="saved-compact" key={home.id}>
          <img src={home.image} alt={home.title} /><div><div><strong>¥ {home.price} /月</strong><button onClick={() => toggleLiked(home.id)}><Heart size={18} fill="currentColor" /></button></div><b>{home.title}</b><p>{home.subtitle}</p></div>
        </article> : <article className="saved-card" key={home.id} onClick={index === 0 ? openDetail : undefined}>
          <div className="saved-photo"><img src={home.image} alt={home.title} />{home.badge && <span>{home.badge}</span>}<button onClick={event => { event.stopPropagation(); toggleLiked(home.id); }}><Heart size={21} fill="currentColor" /></button></div>
          <div className="saved-info"><h2>¥ {home.price} <small>/月</small></h2><p>{home.title} | {home.subtitle}</p><div><span><BedDouble />{home.beds}</span><span><Square />{home.area}</span>{home.metro && <span><MapPin />{home.metro}</span>}</div></div>
        </article>)}
        {!items.length && <EmptyState icon={<Heart />} title="这里还是空的" text="收藏喜欢的房源后会显示在这里" />}
      </div>
      <section className="recommend"><h2>为您推荐</h2><button><span><Sparkles /></span><div><b>发现更多相似房源</b><small>根据您的收藏，我们发现了 5 个新房源</small></div><ChevronRight /></button></section>
    </main>
  </>;
}

function DetailPage({ saved, onBack, onSave, onContact }) {
  return <main className="detail-page">
    <div className="detail-hero"><img src="/assets/detail-hero.jpg" alt="阳光市中心公寓" /><button className="hero-action left" onClick={onBack}><ArrowLeft /></button><button className="hero-action right"><Share2 /></button><span>1 / 8</span></div>
    <section className="detail-panel">
      <div className="detail-title"><div><h1>阳光市中心公寓</h1><p><span>★</span><b>4.8</b><i>•</i> 静安区，上海</p></div><strong>¥4,500<small>/月</small></strong></div>
      <div className="divider" />
      <h3>配套设施</h3><div className="amenities"><Amenity Icon={Wifi} label="WiFi" /><Amenity Icon={House} label="厨房" /><Amenity Icon={Snowflake} label="空调" /><Amenity Icon={CircleParking} label="停车位" /></div>
      <h3>房源介绍</h3><p className="description">这间充满阳光的公寓位于城市心脏地带，步行即可到达主要地铁站。室内设计现代且充满艺术气息，配备了高品质的家具和全套家电。大面积的落地窗为您提供绝佳的城市视野。非常适合追求高品质生活的年轻专业人士或学生。</p><button className="read-more">阅读更多⌄</button>
      <div className="map-heading"><h3>地理位置</h3><button>查看地图</button></div><div className="map-preview"><img src="/assets/detail-map.jpg" alt="地图位置" /><span><i /></span></div><p className="address"><MapPin />上海市静安区南京西路1234号</p>
    </section>
    <nav className="detail-nav"><button className={saved ? 'save active' : 'save'} onClick={onSave}><Heart fill={saved ? 'currentColor' : 'none'} /><small>{saved ? '已收藏' : '收藏'}</small></button><button className="contact" onClick={onContact}><MessageSquare />立即联系</button></nav>
  </main>;
}

function ProfilePage({ showToast }) {
  const rows = [[CalendarDays, '我的预约', 'blue'], [FileText, '租约管理', 'teal'], [WalletCards, '支付记录', 'orange'], [Settings, '设置', 'gray'], [HelpCircle, '帮助中心', 'gray']];
  return <>
    <TopBar title="HomeSeek" leading={<Search size={21} />} action={<Bell size={19} />} />
    <main className="page profile-page">
      <section className="profile-hero"><div className="avatar-wrap"><img src="/assets/avatar.jpg" alt="张先生" /><span>✓</span></div><div><h1>张先生</h1><p>尊享租客 · 加入于 2023</p></div><button onClick={() => showToast('资料编辑功能即将开放')}>编辑资料</button></section>
      <section className="stats"><div><small>我的收藏</small><strong>12</strong></div><div><small>足迹</small><strong>48</strong></div></section>
      <section className="profile-menu">{rows.map(([Icon, label, tone], index) => <div key={label} className={index === 3 ? 'menu-break' : ''}><button onClick={() => showToast(`${label}功能即将开放`)}><span className={`menu-icon ${tone}`}><Icon /></span>{label}<ChevronRight /></button></div>)}</section>
      <button className="logout" onClick={() => showToast('已安全退出当前账号')}>退出登录</button>
    </main>
  </>;
}

function MessagesPage() { return <><TopBar title="消息" leading={<Mail size={21} />} /><main className="page messages-page"><EmptyState icon={<Mail />} title="暂无新消息" text="房东回复与系统通知会出现在这里" /></main></>; }
function TopBar({ title, leading, action }) { return <header className="top-bar"><div>{leading}<b>{title}</b></div><button aria-label="页面操作">{action}</button></header>; }
function Amenity({ Icon, label }) { return <div><Icon /><small>{label}</small></div>; }
function EmptyState({ icon, title, text }) { return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{text}</p></div>; }
function BottomNav({ active, onNavigate }) { return <nav className="bottom-nav">{navItems.map(({ id, label, Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onNavigate(id)}><Icon fill={active === id && id !== 'messages' ? 'currentColor' : 'none'} /><small>{label}</small></button>)}</nav>; }
function ContactSheet({ onClose, onDone }) { return <div className="sheet-backdrop" onClick={onClose}><section className="contact-sheet" onClick={event => event.stopPropagation()}><button className="close" onClick={onClose}><X /></button><span className="contact-icon"><MessageSquare /></span><h2>联系房东</h2><p>留下联系方式，房东会尽快与您确认看房时间。</p><input aria-label="手机号码" inputMode="tel" placeholder="请输入手机号码" /><button className="submit-contact" onClick={onDone}>发送联系请求</button></section></div>; }
