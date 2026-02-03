'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = 'https://stack-tracker-pro-production.up.railway.app';

type Metal = 'silver' | 'gold';

interface Holding {
  id: string;
  metal: Metal;
  product: string;
  ozt: number;
  quantity: number;
  unitPrice: number;
  dealer: string;
  date: string;
  notes?: string;
}

interface SpotPrices {
  silver: number;
  gold: number;
  timestamp?: string;
  source?: string;
}

interface DailyChange {
  amount: number | null;
  percent: number | null;
}

export default function Home() {
  // Holdings state
  const [silverHoldings, setSilverHoldings] = useState<Holding[]>([]);
  const [goldHoldings, setGoldHoldings] = useState<Holding[]>([]);
  
  // Spot prices
  const [spotPrices, setSpotPrices] = useState<SpotPrices>({ silver: 0, gold: 0 });
  const [loading, setLoading] = useState(true);
  const [dailyChange, setDailyChange] = useState<{ gold: DailyChange; silver: DailyChange }>({
    gold: { amount: null, percent: null },
    silver: { amount: null, percent: null },
  });
  
  // UI state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'holdings'>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Holding>>({
    metal: 'silver',
    product: '',
    ozt: 1,
    quantity: 1,
    unitPrice: 0,
    dealer: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedSilver = localStorage.getItem('stack_silver_holdings');
    const loadedGold = localStorage.getItem('stack_gold_holdings');
    
    if (loadedSilver) setSilverHoldings(JSON.parse(loadedSilver));
    if (loadedGold) setGoldHoldings(JSON.parse(loadedGold));
    
    fetchSpotPrices();
  }, []);

  // Save to localStorage whenever holdings change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('stack_silver_holdings', JSON.stringify(silverHoldings));
    }
  }, [silverHoldings, loading]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('stack_gold_holdings', JSON.stringify(goldHoldings));
    }
  }, [goldHoldings, loading]);

  // Fetch spot prices from API
  const fetchSpotPrices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/spot-prices`);
      const data = await response.json();
      
      if (data.success && data.silver && data.gold) {
        setSpotPrices({
          silver: data.silver,
          gold: data.gold,
          timestamp: data.timestamp,
          source: data.source,
        });
        
        if (data.change) {
          setDailyChange({
            gold: {
              amount: data.change.gold?.amount ?? null,
              percent: data.change.gold?.percent ?? null,
            },
            silver: {
              amount: data.change.silver?.amount ?? null,
              percent: data.change.silver?.percent ?? null,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch spot prices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio stats
  const totalSilverOzt = silverHoldings.reduce((sum, h) => sum + (h.ozt * h.quantity), 0);
  const totalGoldOzt = goldHoldings.reduce((sum, h) => sum + (h.ozt * h.quantity), 0);
  
  const silverMeltValue = totalSilverOzt * spotPrices.silver;
  const goldMeltValue = totalGoldOzt * spotPrices.gold;
  const totalMeltValue = silverMeltValue + goldMeltValue;
  
  const totalCost = [
    ...silverHoldings.map(h => h.unitPrice * h.quantity),
    ...goldHoldings.map(h => h.unitPrice * h.quantity),
  ].reduce((sum, cost) => sum + cost, 0);
  
  const profitLoss = totalMeltValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

  // Add or update holding
  const saveHolding = () => {
    if (!formData.product || !formData.metal) return;
    
    const holding: Holding = {
      id: editingHolding?.id || Date.now().toString(),
      metal: formData.metal as Metal,
      product: formData.product,
      ozt: formData.ozt || 1,
      quantity: formData.quantity || 1,
      unitPrice: formData.unitPrice || 0,
      dealer: formData.dealer || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      notes: formData.notes || '',
    };
    
    if (editingHolding) {
      // Update existing
      if (holding.metal === 'silver') {
        setSilverHoldings(silverHoldings.map(h => h.id === holding.id ? holding : h));
      } else {
        setGoldHoldings(goldHoldings.map(h => h.id === holding.id ? holding : h));
      }
    } else {
      // Add new
      if (holding.metal === 'silver') {
        setSilverHoldings([...silverHoldings, holding]);
      } else {
        setGoldHoldings([...goldHoldings, holding]);
      }
    }
    
    closeModal();
  };

  const deleteHolding = (id: string, metal: Metal) => {
    if (metal === 'silver') {
      setSilverHoldings(silverHoldings.filter(h => h.id !== id));
    } else {
      setGoldHoldings(goldHoldings.filter(h => h.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingHolding(null);
    setFormData({
      metal: 'silver',
      product: '',
      ozt: 1,
      quantity: 1,
      unitPrice: 0,
      dealer: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowAddModal(true);
  };

  const openEditModal = (holding: Holding) => {
    setEditingHolding(holding);
    setFormData(holding);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingHolding(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatChange = (change: DailyChange) => {
    if (change.amount === null || change.percent === null) return null;
    
    const isPositive = change.amount >= 0;
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    const sign = isPositive ? '+' : '';
    
    return (
      <span className={color}>
        {sign}{formatCurrency(change.amount)} ({sign}{change.percent.toFixed(2)}%)
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Stack Tracker <span className="text-[var(--gold)]">Gold</span>
          </h1>
          <p className="text-[var(--text-secondary)]">Privacy-first precious metals portfolio tracker</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-[var(--gold)] border-b-2 border-[var(--gold)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('holdings')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'holdings'
                ? 'text-[var(--gold)] border-b-2 border-[var(--gold)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Holdings
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Spot Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)]">
                <div className="text-[var(--text-secondary)] text-sm mb-1">Gold Spot</div>
                <div className="text-3xl font-bold text-[var(--gold)] mb-2">
                  {formatCurrency(spotPrices.gold)}
                </div>
                {formatChange(dailyChange.gold)}
              </div>
              
              <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)]">
                <div className="text-[var(--text-secondary)] text-sm mb-1">Silver Spot</div>
                <div className="text-3xl font-bold text-[var(--silver)] mb-2">
                  {formatCurrency(spotPrices.silver)}
                </div>
                {formatChange(dailyChange.silver)}
              </div>
            </div>

            {/* Portfolio Stats */}
            <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)]">
              <h2 className="text-xl font-bold mb-4">Portfolio Value</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Silver</div>
                  <div className="text-xl font-semibold">{totalSilverOzt.toFixed(2)} oz</div>
                  <div className="text-[var(--silver)]">{formatCurrency(silverMeltValue)}</div>
                </div>
                
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Gold</div>
                  <div className="text-xl font-semibold">{totalGoldOzt.toFixed(4)} oz</div>
                  <div className="text-[var(--gold)]">{formatCurrency(goldMeltValue)}</div>
                </div>
                
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Total Value</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalMeltValue)}</div>
                </div>
                
                <div>
                  <div className="text-[var(--text-secondary)] text-sm">Profit/Loss</div>
                  <div className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(profitLoss)}
                  </div>
                  <div className={profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {profitLossPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="text-xs text-[var(--text-muted)]">
                Last updated: {spotPrices.timestamp ? new Date(spotPrices.timestamp).toLocaleString() : 'N/A'}
                {spotPrices.source && ` • Source: ${spotPrices.source}`}
              </div>
            </div>

            {/* Holdings Summary */}
            <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Recent Holdings</h2>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:bg-[var(--gold-dim)] transition-colors"
                >
                  + Add Holding
                </button>
              </div>
              
              <div className="space-y-2">
                {[...silverHoldings, ...goldHoldings]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map(holding => (
                    <div key={holding.id} className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <div>
                        <div className="font-medium">{holding.product}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {holding.quantity} × {holding.ozt} oz {holding.metal}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(holding.unitPrice * holding.quantity)}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{holding.date}</div>
                      </div>
                    </div>
                  ))}
                
                {silverHoldings.length === 0 && goldHoldings.length === 0 && (
                  <div className="text-center text-[var(--text-secondary)] py-8">
                    No holdings yet. Click "Add Holding" to get started!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">All Holdings</h2>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:bg-[var(--gold-dim)] transition-colors"
              >
                + Add Holding
              </button>
            </div>

            {/* Silver Holdings */}
            {silverHoldings.length > 0 && (
              <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)]">
                <h3 className="text-xl font-bold mb-4 text-[var(--silver)]">Silver Holdings</h3>
                <div className="space-y-2">
                  {silverHoldings.map(holding => (
                    <div key={holding.id} className="flex justify-between items-center p-4 bg-[var(--bg-secondary)] rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold">{holding.product}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {holding.dealer && `${holding.dealer} • `}
                          {holding.quantity} × {holding.ozt} oz = {(holding.quantity * holding.ozt).toFixed(2)} oz total
                        </div>
                        {holding.notes && (
                          <div className="text-sm text-[var(--text-muted)] mt-1">{holding.notes}</div>
                        )}
                      </div>
                      <div className="text-right mr-4">
                        <div className="font-semibold">{formatCurrency(holding.unitPrice * holding.quantity)}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{holding.date}</div>
                        <div className="text-sm text-[var(--silver)]">
                          Melt: {formatCurrency(holding.quantity * holding.ozt * spotPrices.silver)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(holding)}
                          className="px-3 py-1 text-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteHolding(holding.id, 'silver')}
                          className="px-3 py-1 text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gold Holdings */}
            {goldHoldings.length > 0 && (
              <div className="bg-[var(--bg-card)] p-6 rounded-lg border border-[var(--border)]">
                <h3 className="text-xl font-bold mb-4 text-[var(--gold)]">Gold Holdings</h3>
                <div className="space-y-2">
                  {goldHoldings.map(holding => (
                    <div key={holding.id} className="flex justify-between items-center p-4 bg-[var(--bg-secondary)] rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold">{holding.product}</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {holding.dealer && `${holding.dealer} • `}
                          {holding.quantity} × {holding.ozt} oz = {(holding.quantity * holding.ozt).toFixed(4)} oz total
                        </div>
                        {holding.notes && (
                          <div className="text-sm text-[var(--text-muted)] mt-1">{holding.notes}</div>
                        )}
                      </div>
                      <div className="text-right mr-4">
                        <div className="font-semibold">{formatCurrency(holding.unitPrice * holding.quantity)}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{holding.date}</div>
                        <div className="text-sm text-[var(--gold)]">
                          Melt: {formatCurrency(holding.quantity * holding.ozt * spotPrices.gold)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(holding)}
                          className="px-3 py-1 text-sm bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteHolding(holding.id, 'gold')}
                          className="px-3 py-1 text-sm bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {silverHoldings.length === 0 && goldHoldings.length === 0 && (
              <div className="bg-[var(--bg-card)] p-12 rounded-lg border border-[var(--border)] text-center">
                <div className="text-[var(--text-secondary)] text-lg mb-4">
                  No holdings yet
                </div>
                <button
                  onClick={openAddModal}
                  className="px-6 py-3 bg-[var(--gold)] text-black font-semibold rounded-lg hover:bg-[var(--gold-dim)] transition-colors"
                >
                  Add Your First Holding
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-card)] p-6 rounded-lg max-w-md w-full border border-[var(--border)] max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingHolding ? 'Edit Holding' : 'Add Holding'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Metal Type</label>
                  <select
                    value={formData.metal}
                    onChange={(e) => setFormData({ ...formData, metal: e.target.value as Metal })}
                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                    disabled={!!editingHolding}
                  >
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                    placeholder="e.g., American Silver Eagle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Troy Oz Each</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.ozt}
                      onChange={(e) => setFormData({ ...formData, ozt: parseFloat(e.target.value) })}
                      className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Dealer / Source</label>
                  <input
                    type="text"
                    value={formData.dealer}
                    onChange={(e) => setFormData({ ...formData, dealer: e.target.value })}
                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                    placeholder="e.g., APMEX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveHolding}
                  className="flex-1 px-4 py-2 bg-[var(--gold)] text-black font-semibold rounded-lg hover:bg-[var(--gold-dim)] transition-colors"
                >
                  {editingHolding ? 'Update' : 'Add'} Holding
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
