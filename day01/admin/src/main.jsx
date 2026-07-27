import React from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')).render(<ConfigProvider locale={zhCN} theme={{token:{colorPrimary:'#ef604d',borderRadius:10,fontFamily:'"Noto Sans SC","PingFang SC",sans-serif'}}}><App/></ConfigProvider>);
