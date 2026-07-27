import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CalendarDays, ChevronDown, Heart, Home, List, Map, MapPin, MessageCircle, Phone, Search, Shield, SlidersHorizontal, Star, UserRound, Wifi, Wind, Car, X } from 'lucide-react';
import { api } from './api';

const defaultFilters = { keyword: '', rentType: '不限', price: '不限', rooms: '不限' };
const tabs = [{key:'home',label:'首页',Icon:Home},{key:'favorites',label:'收藏',Icon:Heart},{key:'messages',label:'消息',Icon:MessageCircle},{key:'profile',label:'我的',Icon:UserRound}];
const popularSearches = ['劲松', '望京', '五道口', '鼓楼大街'];

const money = (value) => Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
const subwayText = (value = '') => /步行|骑行|公交/.test(value) ? value : value.replace(/(\d+)\s*分钟/, '步行 $1 分钟');
const floorText = (item) => item.title?.includes('胡同') && item.floor === '1/2层' ? '低楼层 · 共2层' : item.floor;
const readSearchHistory = () => { try { return JSON.parse(localStorage.getItem('zufang-search-history') || '[]'); } catch { return []; } };

export default function App() {
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [filters, setFilters] = useState(defaultFilters);
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState('list');
  const [detail, setDetail] = useState(null);
  const [booking, setBooking] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState(readSearchHistory);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextFilters.keyword) params.set('keyword', nextFilters.keyword);
      if (nextFilters.rentType !== '不限') params.set('rentType', nextFilters.rentType);
      if (nextFilters.price !== '不限') params.set('price', nextFilters.price);
      if (nextFilters.rooms !== '不限') params.set('rooms', nextFilters.rooms);
      const [listingData, favoriteData] = await Promise.all([api(`/listings?${params}`), api('/favorites')]);
      setListings(listingData.data); setFavorites(new Set(favoriteData.data.map(item => item.id)));
    } catch (error) { showToast(error.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filters.rentType, filters.price, filters.rooms]);

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const runSearch = (keyword) => {
    const value = keyword.trim();
    const nextFilters = {...filters, keyword: value};
    setFilters(nextFilters); setSearchOpen(false); load(nextFilters);
    if (value) {
      const nextHistory = [value, ...searchHistory.filter(item => item !== value)].slice(0, 6);
      setSearchHistory(nextHistory); localStorage.setItem('zufang-search-history', JSON.stringify(nextHistory));
    }
  };
  const submitSearch = (event) => { event.preventDefault(); runSearch(filters.keyword); };
  const clearFilters = () => { setFilters(defaultFilters); setSearchOpen(false); load(defaultFilters); };
  const hasFilters = filters.keyword || filters.rentType !== '不限' || filters.price !== '不限' || filters.rooms !== '不限';
  const toggleFavorite = async (listing, event) => {
    event?.stopPropagation();
    try {
      const result = await api(`/favorites/${listing.id}`, { method: favorites.has(listing.id) ? 'DELETE' : 'POST' });
      setFavorites(prev => { const next = new Set(prev); result.favorite ? next.add(listing.id) : next.delete(listing.id); return next; });
      showToast(result.favorite ? '已加入收藏' : '已取消收藏');
    } catch (error) { showToast(error.message); }
  };

  const visibleListings = useMemo(() => activeTab === 'favorites' ? listings.filter(item => favorites.has(item.id)) : listings, [activeTab, listings, favorites]);
  if (detail) return <><Detail listing={detail} favorite={favorites.has(detail.id)} onBack={() => setDetail(null)} onFavorite={(e) => toggleFavorite(detail,e)} onBook={() => setBooking(true)} />{booking && <BookingModal listing={detail} onClose={()=>setBooking(false)} onSuccess={()=>{setBooking(false);showToast('预约成功，房东会尽快联系你')}}/>}{toast && <div className="toast">{toast}</div>}</>;

  return <div className="app-shell">
    <header className="header">
      <div className="top-row"><button className="city"><MapPin size={17}/> 北京 <ChevronDown size={14}/></button>
        <form className="search" onSubmit={submitSearch}><Search size={17}/><input aria-label="搜索房源" placeholder="搜索小区、地铁、商圈..." value={filters.keyword} onChange={e=>setFilters({...filters,keyword:e.target.value})}/></form>
        <button className="round-btn" aria-label="筛选"><SlidersHorizontal size={18}/></button></div>
      <div className="chips">
        {['不限','整租','合租'].map(item=><button key={item} className={filters.rentType===item?'chip active':'chip'} onClick={()=>setFilters({...filters,rentType:item})}>{item}</button>)}
        <SelectChip label="价格" value={filters.price} values={['不限','0-3000','3000-5000','5000-8000','8000+']} onChange={value=>setFilters({...filters,price:value})}/>
        <SelectChip label="户型" value={filters.rooms} values={['不限','1','2','3+']} onChange={value=>setFilters({...filters,rooms:value})}/>
      </div>
    </header>

    <main className="content">
      {activeTab === 'messages' ? <Messages /> : activeTab === 'profile' ? <Profile favorites={favorites.size}/> : <>
        <div className="result-bar"><span>{activeTab === 'favorites' ? `收藏 ${visibleListings.length} 套房源` : `共 ${visibleListings.length} 套房源`}</span><div className="view-toggle"><button className={view==='list'?'on':''} onClick={()=>setView('list')}><List size={15}/>列表</button><button className={view==='map'?'on':''} onClick={()=>setView('map')}><Map size={15}/>地图</button></div></div>
        {loading ? <div className="state">正在加载房源...</div> : visibleListings.length === 0 ? <EmptyFavorite onHome={()=>setActiveTab('home')}/> : view === 'map' ? <MapView listings={visibleListings} onSelect={setDetail}/> : <div className="listing-list">{visibleListings.map(item=><ListingCard key={item.id} item={item} favorite={favorites.has(item.id)} onFavorite={toggleFavorite} onSelect={setDetail}/>)}</div>}
      </>}
    </main>
    <nav className="bottom-nav">{tabs.map(({key,label,Icon})=><button key={key} className={activeTab===key?'active':''} onClick={()=>{setActiveTab(key);setView('list')}}><Icon size={22}/><span>{label}{key==='favorites'&&favorites.size?`(${favorites.size})`:''}</span></button>)}</nav>
    {booking && <BookingModal listing={detail} onClose={()=>setBooking(false)} onSuccess={()=>{setBooking(false);showToast('预约成功，房东会尽快联系你')}}/>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}

function SelectChip({label,value,values,onChange}) {
  return <label className={value!=='不限'?'chip select active':'chip select'}>{value==='不限'?label:value}<ChevronDown size={13}/><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
}

function ListingCard({item,favorite,onFavorite,onSelect}) {
  return <article className="listing-card" onClick={()=>onSelect(item)}>
    <div className="image-wrap"><img src={item.image_url} alt={item.title}/><span className="type-badge">{item.rent_type}</span><button className={favorite?'heart active':'heart'} aria-label={favorite?'取消收藏':'收藏'} onClick={e=>onFavorite(item,e)}><Heart size={18} fill={favorite?'currentColor':'none'}/></button></div>
    <div className="listing-main"><h3>{item.title}</h3><p><MapPin size={14}/> {item.subway}</p><div className="facts">{item.layout}<i/> {item.area}㎡ <i/> {item.floor}</div><div className="tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div>
    <div className="price"><strong>¥{money(item.price)}</strong><span>/月</span><em><Star size={13} fill="currentColor"/> {item.rating}</em></div>
  </article>;
}

function MapView({listings,onSelect}) { return <div className="map-view"><div className="map-grid"/>{listings.map((item,index)=><button key={item.id} style={{left:`${15+(index*29)%72}%`,top:`${18+(index*23)%62}%`}} onClick={()=>onSelect(item)}>¥{money(item.price)}</button>)}<div className="map-count"><Building2 size={16}/>{listings.length} 套房源</div></div>; }

function Detail({listing,favorite,onBack,onFavorite,onBook}) { return <div className="detail-page"><div className="hero"><img src={listing.image_url} alt={listing.title}/><button className="floating left" onClick={onBack}><ArrowLeft/></button><button className={favorite?'floating right favorite':'floating right'} onClick={onFavorite}><Heart fill={favorite?'currentColor':'none'}/></button></div><div className="detail-body"><div className="detail-title"><div><div className="eyebrow"><Shield size={14}/> 已认证 <span>{listing.rent_type}</span></div><h1>{listing.title}</h1><p><MapPin size={14}/> {listing.district} · {listing.subway}</p></div><div className="detail-price"><strong>¥{listing.price.toLocaleString()}</strong><span>元/月</span></div></div><div className="metric-row"><Metric value={listing.layout} label="户型"/><Metric value={`${listing.area}㎡`} label="面积"/><Metric value={listing.floor} label="楼层"/></div><div className="tags large">{listing.tags.map(tag=><span key={tag}>{tag}</span>)}</div><section><h3>配套设施</h3><div className="facilities"><span><Wifi/>Wi-Fi</span><span><Wind/>空调</span><span><Car/>停车</span></div></section><section><h3>房源描述</h3><p className="description">{listing.description}</p></section><div className="review"><span><Star size={17} fill="currentColor"/> <b>{listing.rating}</b>　{listing.review_count} 条评价</span><em>随时可看</em></div><div className="landlord"><div className="avatar">{listing.landlord_name?.[0]}</div><div><b>{listing.landlord_name}</b><span>房东 · 实名认证</span></div><a href={`tel:${listing.landlord_phone}`} aria-label="拨打电话"><Phone/></a><button aria-label="发送消息"><MessageCircle/></button></div></div><div className="detail-footer"><button className="outline"><MessageCircle/>在线咨询</button><button className="primary" onClick={onBook}><CalendarDays/>预约看房</button></div></div>; }
function Metric({value,label}) { return <div><b>{value}</b><span>{label}</span></div>; }

function BookingModal({listing,onClose,onSuccess}) { const [form,setForm]=useState({name:'',phone:'',visitTime:''}); const submit=async e=>{e.preventDefault();await api('/appointments',{method:'POST',body:JSON.stringify({...form,listingId:listing.id})});onSuccess();}; return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><button type="button" className="modal-close" onClick={onClose}><X/></button><h2>预约看房</h2><p>{listing.title}</p><label>姓名<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="请输入姓名"/></label><label>手机号<input required pattern="1[3-9][0-9]{9}" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="请输入手机号"/></label><label>看房时间<input required type="datetime-local" value={form.visitTime} onChange={e=>setForm({...form,visitTime:e.target.value})}/></label><button className="primary submit">确认预约</button></form></div>; }

function Messages(){return <div className="simple-page"><div className="page-icon"><MessageCircle/></div><h2>消息中心</h2><div className="message-card"><span className="avatar system">暖</span><div><b>暖居小助手</b><p>预约进度和房东消息会显示在这里。</p></div><time>刚刚</time></div></div>}
function Profile({favorites}){return <div className="simple-page profile"><div className="profile-card"><div className="avatar big">客</div><div><h2>暖居访客</h2><p>发现适合你的温暖住所</p></div></div><div className="profile-stats"><div><b>{favorites}</b><span>我的收藏</span></div><div><b>0</b><span>预约看房</span></div><div><b>0</b><span>浏览记录</span></div></div><div className="menu-list"><button>我的预约 <ChevronDown/></button><button>联系客服 <ChevronDown/></button><button>关于暖居 <ChevronDown/></button></div></div>}
function EmptyFavorite({onHome}){return <div className="state empty"><Heart/><h3>还没有收藏房源</h3><p>遇到喜欢的房子，点亮爱心收藏吧</p><button onClick={onHome}>去逛逛</button></div>}
