import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('HomeSeek H5', () => {
  it('renders the explore page and its three property cards', () => {
    render(<App />);

    expect(screen.getByText('HomeSeek')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText('市中心现代单间')).toBeInTheDocument();
  });

  it('filters listings by category and keyword', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '住宅' }));
    expect(screen.getByText('温馨三居室家庭住宅')).toBeInTheDocument();
    expect(screen.queryByText('市中心现代单间')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部' }));
    await user.type(screen.getByPlaceholderText('搜索城市、社区...'), '深圳');
    expect(screen.getByText('工业风时尚阁楼')).toBeInTheDocument();
    expect(screen.queryByText('温馨三居室家庭住宅')).not.toBeInTheDocument();
  });

  it('opens the property detail and returns to explore', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByText('市中心现代单间'));
    expect(screen.getByRole('heading', { name: '阳光市中心公寓' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即联系' })).toBeInTheDocument();

    await user.click(container.querySelector('.hero-action.left'));
    expect(screen.getByText('市中心现代单间')).toBeInTheDocument();
  });

  it('navigates to saved and profile pages', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Saved' }));
    expect(screen.getByText('我的收藏')).toBeInTheDocument();
    expect(screen.getByText('静安区 · 愚园路 | 极简风格两居室')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('heading', { name: '张先生' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '租约管理' })).toBeInTheDocument();
  });

  it('toggles a saved item and submits the contact sheet', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstCard = screen.getAllByRole('article')[0];
    await user.click(within(firstCard).getByRole('button', { name: '收藏' }));
    await user.click(screen.getByText('市中心现代单间'));
    expect(screen.getByRole('button', { name: '收藏' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '立即联系' }));
    expect(screen.getByRole('heading', { name: '联系房东' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('手机号码'), '13800138000');
    await user.click(screen.getByRole('button', { name: '发送联系请求' }));
    expect(screen.getByText('已发送联系请求')).toBeInTheDocument();
  });
});
