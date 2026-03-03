import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart3, PackageOpen, Users, TrendingUp, AlertTriangle, Plus, Edit2, ShieldAlert, FileText, CheckCircle, XCircle, Clock, Upload, MapPin } from 'lucide-react';

const ManagerDashboard = () => {
    useEffect(() => {
        console.log("ManagerDashboard loaded");

        addDoc(collection(db, "test_connection"), {
            status: "connected from manager",
            time: new Date()
        })
            .then(() => console.log("Firestore write success"))
            .catch((err) => console.error("Firestore error:", err));

    }, []);
    const {
        branches, products, users, sales, audits, auditTasks, attendance, supplies,
        addProduct, addProductsBulk, addUser, updateProductStock, updateUserDeductions, updateUserTargets,
        approveAudit, rejectAudit, getTodayString, getUserAttendanceCount, getBranchAttendanceToday, getInactiveProducts,
        updateSale, assignAuditTask, updateSupplyStock
    } = useApp();

    const [activeTab, setActiveTab] = useState('overview');

    const today = getTodayString();
    const todaySales = sales.filter(s => s.date === today);

    const pendingAuditsCount = audits.filter(a => a.status === 'pending').length;

    const OverviewTab = () => {
        const [selectedBranch, setSelectedBranch] = useState(null);

        // Date Helpers
        const getOffsetDateStr = (offset) => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            return d.toISOString().split('T')[0];
        };
        const yesterdayStr = getOffsetDateStr(-1);
        const [startDate, setStartDate] = useState(today.substring(0, 8) + '01');
        const [endDate, setEndDate] = useState(today);

        // Comparative Metrics Calculations
        const todayRev = sales.filter(s => s.date === today).reduce((sum, s) => sum + s.totalPrice, 0);
        const yestRev = sales.filter(s => s.date === yesterdayStr).reduce((sum, s) => sum + s.totalPrice, 0);

        const thisMonthPrefix = today.substring(0, 7);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthPrefix = lastMonthDate.toISOString().split('T')[0].substring(0, 7);

        const thisMonthRev = sales.filter(s => s.date.startsWith(thisMonthPrefix)).reduce((sum, s) => sum + s.totalPrice, 0);
        const lastMonthRev = sales.filter(s => s.date.startsWith(lastMonthPrefix)).reduce((sum, s) => sum + s.totalPrice, 0);

        // Week logic
        const thisWeekStart = getOffsetDateStr(-7);
        const lastWeekStart = getOffsetDateStr(-14);

        const thisWeekRev = sales.filter(s => s.date > thisWeekStart && s.date <= today).reduce((sum, s) => sum + s.totalPrice, 0);
        const lastWeekRev = sales.filter(s => s.date > lastWeekStart && s.date <= thisWeekStart).reduce((sum, s) => sum + s.totalPrice, 0);

        // Filtered logic for custom range
        const filteredSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
        const filteredRev = filteredSales.reduce((sum, s) => sum + s.totalPrice, 0);

        const branchStats = branches.map(branch => {
            const bSales = filteredSales.filter(s => s.branchId === branch.id);
            const revenue = bSales.reduce((sum, s) => sum + s.totalPrice, 0);
            const grams = bSales.reduce((sum, s) => sum + s.grams, 0);
            return { ...branch, revenue, grams };
        }).sort((a, b) => b.revenue - a.revenue);

        const productSalesPeriod = {};
        filteredSales.forEach(s => {
            if (!productSalesPeriod[s.productId]) productSalesPeriod[s.productId] = 0;
            productSalesPeriod[s.productId] += s.grams;
        });
        const topProductsPeriod = Object.entries(productSalesPeriod)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([pid, g]) => ({ product: products.find(p => p.id === pid), gramsSold: g }));

        const BranchModal = () => {
            if (!selectedBranch) return null;
            const branchUsers = users.filter(u => u.branchId === selectedBranch.id);
            const branchSalesAll = sales.filter(s => s.branchId === selectedBranch.id);
            const branchSales = branchSalesAll.filter(s => s.date === today);
            const attendanceToday = getBranchAttendanceToday(branchUsers);

            const [editingSale, setEditingSale] = useState(null);
            const [editSaleData, setEditSaleData] = useState({ grams: '', price: '' });

            const handleSaveSale = (saleId) => {
                updateSale(saleId, editSaleData.grams, editSaleData.price);
                setEditingSale(null);
            };

            // Analytics
            const bTodayRev = branchSales.reduce((sum, s) => sum + s.totalPrice, 0);
            const bYestRev = branchSalesAll.filter(s => s.date === getOffsetDateStr(-1)).reduce((sum, s) => sum + s.totalPrice, 0);
            const bThisMonthRev = branchSalesAll.filter(s => s.date.startsWith(thisMonthPrefix)).reduce((sum, s) => sum + s.totalPrice, 0);
            const bLastMonthRev = branchSalesAll.filter(s => s.date.startsWith(lastMonthPrefix)).reduce((sum, s) => sum + s.totalPrice, 0);

            const bMonthSales = branchSalesAll.filter(s => s.date.startsWith(thisMonthPrefix));
            const bProductSales = {};
            bMonthSales.forEach(s => {
                bProductSales[s.productId] = (bProductSales[s.productId] || 0) + s.grams;
            });

            return (
                <div className="invoice-modal-overlay" style={{ direction: 'rtl', padding: '1rem' }}>
                    <div className="invoice-modal" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>تفاصيل {selectedBranch.name}</h3>
                            <button className="btn btn-icon-only btn-outline" onClick={() => setSelectedBranch(null)}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="glass-card" style={{ padding: '1rem', borderRight: '4px solid var(--primary-gold)' }}>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>اليوم مقارنة بالأمس</p>
                                <h3 className="text-gold">{bTodayRev.toLocaleString()} ج.م</h3>
                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>الأمس: {bYestRev.toLocaleString()} ج.م</span>
                            </div>
                            <div className="glass-card" style={{ padding: '1rem', borderRight: '4px solid var(--success)' }}>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>الشهر مقارنة بالسابق</p>
                                <h3 className="text-success">{bThisMonthRev.toLocaleString()} ج.م</h3>
                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>السابق: {bLastMonthRev.toLocaleString()} ج.م</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                            <div>
                                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} className="text-gold" /> حضور الموظفين (اليوم)</h4>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                    {attendanceToday.map(record => (
                                        <div key={record.user.id} className="flex-between" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span>{record.user.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {record.location && (
                                                    <a href={`https://www.google.com/maps/search/?api=1&query=${record.location.lat},${record.location.lng}`} target="_blank" rel="noreferrer" title="عرض الموقع على الخريطة" className="text-main" style={{ opacity: 0.8 }}>
                                                        <MapPin size={16} />
                                                    </a>
                                                )}
                                                {record.time ? <span className="text-success">{record.time}</span> : <span className="text-danger">غياب</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PackageOpen size={18} className="text-gold" /> العطور الأكثر مبيعاً (الشهر)</h4>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                    {Object.keys(bProductSales).length === 0 ? <p className="text-muted">لا توجد مبيعات هذا الشهر.</p> : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                            <tbody>
                                                {Object.entries(bProductSales)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 10)
                                                    .map(([pId, grams]) => (
                                                        <tr key={pId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '0.5rem' }}>{products.find(p => p.id === pId)?.name || 'عطر'}</td>
                                                            <td style={{ padding: '0.5rem', color: 'var(--primary-gold)' }}>{grams} ج</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>



                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} className="text-gold" /> فواتير اليوم الفرعية</h4>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                            {branchSales.length === 0 ? <p className="text-muted">لا توجد مبيعات مسجلة اليوم.</p> : (
                                <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>الموظف</th>
                                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>العطر</th>
                                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>الكمية</th>
                                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>القيمة</th>
                                            <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>تعديل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchSales.reverse().map(s => {
                                            const pName = products.find(p => p.id === s.productId)?.name;
                                            const eName = users.find(u => u.id === s.employeeId)?.name;
                                            return (
                                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '0.5rem' }}>{eName}</td>
                                                    <td style={{ padding: '0.5rem' }}>{pName}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {editingSale === s.id ? (
                                                            <input type="number" className="form-input" style={{ width: '60px', padding: '0.2rem' }} value={editSaleData.grams} onChange={e => setEditSaleData({ ...editSaleData, grams: e.target.value })} />
                                                        ) : (
                                                            <>
                                                                <div>{s.grams}ج ({s.bottleType})</div>
                                                                {(s.manualAlcoholUsed > 0 || s.manualBagUsed) && (
                                                                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                                                                        {s.manualAlcoholUsed > 0 ? `كحول: ${s.manualAlcoholUsed}ج ` : ''}
                                                                        {s.manualBagUsed ? `| شنطة: ${supplies.find(x => x.id === s.manualBagUsed)?.name || 'مخصص'} ` : ''}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {editingSale === s.id ? (
                                                            <input type="number" className="form-input" style={{ width: '80px', padding: '0.2rem' }} value={editSaleData.price} onChange={e => setEditSaleData({ ...editSaleData, price: e.target.value })} />
                                                        ) : (
                                                            `${s.totalPrice.toLocaleString()} ج.م`
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {editingSale === s.id ? (
                                                            <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSaveSale(s.id)}>حفظ</button>
                                                        ) : (
                                                            <button className="btn btn-icon-only btn-outline" onClick={() => { setEditingSale(s.id); setEditSaleData({ grams: s.grams, price: s.totalPrice }) }}><Edit2 size={14} /></button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button className="btn btn-outline" style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }} onClick={() => { assignAuditTask(selectedBranch.id); alert('تم إرسال طلب جرد لفريق الفرع بنجاح'); }} disabled={auditTasks.includes(selectedBranch.id)}>
                                {auditTasks.includes(selectedBranch.id) ? 'تم طلب جرد من هذا الفرع اليوم' : 'طلب جرد استثنائي من الفرع اليوم'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-fade-in">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}><TrendingUp className="text-gold" /> لوحة التقدير والمقارنات السريعة</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRight: '4px solid var(--primary-gold)' }}>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>مبيعات اليوم مقارنة بالأمس</p>
                        <h2 className="text-gold">{todayRev.toLocaleString()} ج.م</h2>
                        <span className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>الأمس: {yestRev.toLocaleString()} ج.م</span>
                    </div>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRight: '4px solid #4facfe' }}>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>مبيعات هذا الأسبوع مقارنة بالسابق</p>
                        <h2 style={{ color: '#4facfe' }}>{thisWeekRev.toLocaleString()} ج.م</h2>
                        <span className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>الأسبوع السابق: {lastWeekRev.toLocaleString()} ج.م</span>
                    </div>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRight: '4px solid var(--success)' }}>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>مبيعات الشهر الحالي مقارنة بالسابق</p>
                        <h2 className="text-success">{thisMonthRev.toLocaleString()} ج.م</h2>
                        <span className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'block' }}>الشهر السابق: {lastMonthRev.toLocaleString()} ج.م</span>
                    </div>
                </div>

                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.5rem' }}>التحليلات المفصلة (لفترة محددة)</h3>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>إجمالي إيرادات الفترة المحددة: <strong className="text-gold" style={{ fontSize: '1.1rem' }}>{filteredRev.toLocaleString()} ج.م</strong></p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div>
                            <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>من تاريخ</label>
                            <input type="date" className="form-input" style={{ width: '150px' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>إلى تاريخ</label>
                            <input type="date" className="form-input" style={{ width: '150px' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>أداء الفروع خلال الفترة المحددة</h4>
                        <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>الفرع</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>المباع</th>
                                        <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>الإيرادات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchStats.map(bs => (
                                        <tr key={bs.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setSelectedBranch(bs)} className="hover-row">
                                            <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-main)', textDecoration: 'underline' }}>{bs.name}</td>
                                            <td style={{ padding: '1rem' }}>{bs.grams} ج</td>
                                            <td style={{ padding: '1rem', color: 'var(--primary-gold)' }}>{bs.revenue.toLocaleString()} ج.م</td>
                                        </tr>
                                    ))}
                                    {branchStats.length === 0 && <tr><td colSpan="3" style={{ padding: '1rem', textAlign: 'center' }}>لا توجد بيانات للفترة</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>العطور الأكثر مبيعاً في الفترة المحددة</h4>
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            {topProductsPeriod.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {topProductsPeriod.map((tp, idx) => (
                                        <div key={idx} className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 500 }}>{tp.product?.name || 'غير معروف'}</span>
                                            <span className="badge badge-gold">{tp.gramsSold} جرام</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted">لا توجد مبيعات في هذه الفترة.</p>
                            )}
                        </div>
                    </div>
                </div>

                <BranchModal />
                <style>{`.hover-row:hover { background: rgba(255,255,255,0.05); }`}</style>
            </div>
        );
    };

    const InventoryTab = () => {
        const [newP, setNewP] = useState({ name: '', stock: '', price: '' });
        const [editingProduct, setEditingProduct] = useState(null);
        const [editStock, setEditStock] = useState('');
        const [bulkCSV, setBulkCSV] = useState('');

        const inactiveProducts = getInactiveProducts();

        const handleAddProduct = (e) => {
            e.preventDefault();
            addProduct(newP.name, newP.stock, newP.price);
            setNewP({ name: '', stock: '', price: '' });
        };

        const handleBulkSubmit = (e) => {
            e.preventDefault();
            if (!bulkCSV.trim()) return;
            const lines = bulkCSV.split('\n');
            const pArray = [];
            lines.forEach(l => {
                const parts = l.split(',');
                if (parts.length >= 3) {
                    pArray.push({ name: parts[0].trim(), stockGrams: Number(parts[1].trim()), pricePerGram: Number(parts[2].trim()) });
                }
            });
            if (pArray.length > 0) {
                addProductsBulk(pArray);
                setBulkCSV('');
                alert(`تم إضافة ${pArray.length} صنف بنجاح!`);
            }
        };

        const handleSaveStock = (id) => {
            updateProductStock(id, editStock);
            setEditingProduct(null);
        };
        return (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.5fr) minmax(0, 1fr)', gap: '2rem' }}>
                <div>
                    {inactiveProducts.length > 0 && (
                        <div style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                            <h4 className="text-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <AlertTriangle size={18} /> العطور الراكدة (لم تُباع منذ أسبوعين)
                            </h4>
                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                                {inactiveProducts.map(p => p.name).join('، ')}
                            </p>
                        </div>
                    )}

                    <h3 style={{ marginBottom: '1.5rem' }}><PackageOpen className="text-gold" style={{ verticalAlign: 'middle', marginLeft: '0.5rem' }} /> مستودع العطور (الرئيسي)</h3>
                    <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>اسم العطر</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>السعر المقترح/جرام</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>المخزون المركزي</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{p.name} {inactiveProducts.find(i => i.id === p.id) && <AlertTriangle size={14} className="text-danger" style={{ display: 'inline', marginRight: '4px' }} title="عطر راكد" />}</td>
                                        <td style={{ padding: '1rem' }}>{p.pricePerGram} ج.م</td>
                                        <td style={{ padding: '1rem' }}>
                                            {editingProduct === p.id ? (
                                                <input type="number" className="form-input" style={{ padding: '0.25rem 0.5rem', width: '80px' }} value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                                            ) : (
                                                <span className={`badge ${p.stockGrams < 100 ? 'badge-danger' : 'badge-gold'}`}>
                                                    {p.stockGrams} جرام {p.stockGrams < 100 && <AlertTriangle size={12} style={{ marginRight: '4px' }} />}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {editingProduct === p.id ? (
                                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => handleSaveStock(p.id)}>حفظ</button>
                                            ) : (
                                                <button className="btn btn-icon-only btn-outline" onClick={() => { setEditingProduct(p.id); setEditStock(p.stockGrams); }}><Edit2 size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>إضافة عطر جديد</h3>
                        <form onSubmit={handleAddProduct}>
                            <div className="form-group"><label className="form-label">الاسم</label><input required type="text" className="form-input" value={newP.name} onChange={e => setNewP({ ...newP, name: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">الكمية الافتتاحية للمركزي (جرام)</label><input required type="number" className="form-input" value={newP.stock} onChange={e => setNewP({ ...newP, stock: e.target.value })} /></div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}><label className="form-label">السعر المقترح</label><input required type="number" className="form-input" value={newP.price} onChange={e => setNewP({ ...newP, price: e.target.value })} /></div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><Plus size={18} /> إضافة الصنف</button>
                        </form>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>رفع مخزون (شيت)</h3>
                        <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>ألصق البيانات بصيغة: الاسم,الكمية للمركزي,السعر (كل عطر في سطر)</p>
                        <form onSubmit={handleBulkSubmit}>
                            <textarea
                                className="form-input"
                                style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '12px' }}
                                placeholder="عود وود,500,35&#10;جيمي تشو,200,15"
                                value={bulkCSV} onChange={(e) => setBulkCSV(e.target.value)}
                            />
                            <button type="submit" className="btn btn-outline" style={{ width: '100%' }}><Upload size={18} /> رفع البيانات</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const BranchInventoryTab = () => {
        const { updateBranchStock } = useApp();
        const [selectedBranchId, setSelectedBranchId] = useState('');
        const [editingProduct, setEditingProduct] = useState(null);
        const [editStock, setEditStock] = useState('');

        const handleSaveStock = (productId) => {
            if (!selectedBranchId) return;
            updateBranchStock(productId, selectedBranchId, editStock);
            setEditingProduct(null);
        };

        return (
            <div className="animate-fade-in">
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PackageOpen className="text-gold" size={20} /> اختيار الفرع
                    </h3>
                    <select className="form-select" value={selectedBranchId} onChange={(e) => { setSelectedBranchId(e.target.value); setEditingProduct(null); }} style={{ maxWidth: '400px' }}>
                        <option value="" disabled>اختر الفرع لعرض أو تعديل رصيده...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                {selectedBranchId && (
                    <div className="glass-panel" style={{ overflowX: 'auto', padding: '1rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>اسم العطر</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>مخزون الفرع الحالي</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => {
                                    const bStock = p.branchStock?.[selectedBranchId] || 0;
                                    return (
                                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{p.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                {editingProduct === p.id ? (
                                                    <input type="number" className="form-input" style={{ padding: '0.25rem 0.5rem', width: '80px' }} value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                                                ) : (
                                                    <span className={`badge ${bStock < 100 ? 'badge-danger' : 'badge-gold'}`}>
                                                        {bStock} جرام
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {editingProduct === p.id ? (
                                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }} onClick={() => handleSaveStock(p.id)}>حفظ</button>
                                                ) : (
                                                    <button className="btn btn-icon-only btn-outline" onClick={() => { setEditingProduct(p.id); setEditStock(String(bStock)); }}><Edit2 size={16} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const EmployeesTab = () => {
        const { updateUserBranch, assignEmployeeTask } = useApp();
        const employees = users.filter(u => u.role === 'employee');
        const [editMode, setEditMode] = useState(null);
        const [editData, setEditData] = useState({ deductions: '', target: '', monthlyTarget: '', branchId: '' });
        const [selectedEmployee, setSelectedEmployee] = useState(null);

        const handleAssignTask = (empId) => {
            const text = window.prompt("اكتب المهمة المطلوبة من هذا الموظف:");
            if (text && text.trim()) {
                assignEmployeeTask(empId, text.trim());
                alert('تم إرسال المهمة بنجاح وتنبيه الموظف.');
            }
        };

        // New User form
        const [newUser, setNewUser] = useState({ name: '', username: '', pin: '', branchId: '', target: '', monthlyTarget: '' });

        const handleSave = (id) => {
            updateUserDeductions(id, editData.deductions);
            updateUserTargets(id, editData.target, editData.monthlyTarget);
            if (editData.branchId) {
                updateUserBranch(id, editData.branchId);
            }
            setEditMode(null);
        };

        const handleAddUser = (e) => {
            e.preventDefault();
            addUser(newUser);
            setNewUser({ name: '', username: '', pin: '', branchId: '', target: '', monthlyTarget: '' });
            alert('تم إضافة الموظف بنجاح!');
        };

        return (
            <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.5fr) minmax(0, 1fr)', gap: '2rem' }}>
                <div>
                    <h3 style={{ marginBottom: '1.5rem' }}><Users className="text-gold" style={{ verticalAlign: 'middle', marginLeft: '0.5rem' }} /> متابعة الموظفين</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {employees.map(emp => {
                            const empBranch = branches.find(b => b.id === emp.branchId)?.name;
                            const empSalesToday = sales.filter(s => s.employeeId === emp.id && s.date === today);
                            const totalDaily = empSalesToday.reduce((sum, s) => sum + s.totalPrice, 0);

                            // Group daily sales by branch
                            const dailyBranchBreakdown = {};
                            empSalesToday.forEach(s => {
                                if (!dailyBranchBreakdown[s.branchId]) dailyBranchBreakdown[s.branchId] = 0;
                                dailyBranchBreakdown[s.branchId] += s.totalPrice;
                            });

                            const currentMonth = today.substring(0, 7);
                            const empSalesMonthly = sales.filter(s => s.employeeId === emp.id && s.date.startsWith(currentMonth));
                            const totalMonthly = empSalesMonthly.reduce((sum, s) => sum + s.totalPrice, 0);

                            const isPresent = (attendance && attendance[today] ? attendance[today] : []).some(a => a.id === emp.id);
                            const totalDaysAttended = getUserAttendanceCount(emp.id);

                            return (
                                <div key={emp.id} className="glass-card" style={{ padding: '1.5rem' }}>
                                    <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '1.25rem' }}>{emp.name}</h4>
                                        <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>{isPresent ? 'حاضر اليوم' : 'غائب'}</span>
                                    </div>

                                    <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                                        الفرع المخصص حالياً: <strong className="text-main">{empBranch}</strong> | الحضور الشهري: <strong className="text-main">{totalDaysAttended} أيام</strong>
                                    </p>

                                    {editMode === emp.id ? (
                                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                            <div className="form-group">
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>نقل الموظف لفرع آخر</label>
                                                <select className="form-select" style={{ padding: '0.5rem' }} value={editData.branchId} onChange={e => setEditData({ ...editData, branchId: e.target.value })}>
                                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem' }}>التارجت اليومي</label><input type="number" className="form-input" style={{ padding: '0.5rem' }} value={editData.target} onChange={e => setEditData({ ...editData, target: e.target.value })} /></div>
                                            <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem' }}>التارجت الشهري</label><input type="number" className="form-input" style={{ padding: '0.5rem' }} value={editData.monthlyTarget} onChange={e => setEditData({ ...editData, monthlyTarget: e.target.value })} /></div>
                                            <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem' }}>الخصم المالي</label><input type="number" className="form-input" style={{ padding: '0.5rem' }} value={editData.deductions} onChange={e => setEditData({ ...editData, deductions: e.target.value })} /></div>
                                            <div className="flex-between">
                                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleSave(emp.id)}>حفظ ونقل</button>
                                                <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setEditMode(null)}>إلغاء</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                                <div className="flex-between" style={{ marginBottom: '0.5rem' }}><span className="text-muted" style={{ fontSize: '0.875rem' }}>يومي (إجمالي)</span><span className="text-gold font-bold">{totalDaily.toLocaleString()} / {emp.target?.toLocaleString() || 0}</span></div>
                                                <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px', marginBottom: '1rem' }}><div style={{ background: 'var(--primary-gold)', height: '100%', width: `${Math.min(100, (totalDaily / (emp.target || 1)) * 100)}%` }}></div></div>

                                                {Object.keys(dailyBranchBreakdown).length > 0 && (
                                                    <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255, 215, 0, 0.05)', borderRadius: '4px', border: '1px solid rgba(255,215,0,0.1)' }}>
                                                        <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>تفصيل مبيعات اليوم حسب الفروع:</p>
                                                        {Object.entries(dailyBranchBreakdown).map(([bId, amount]) => (
                                                            <div key={bId} className="flex-between" style={{ fontSize: '0.875rem' }}>
                                                                <span>{branches.find(b => b.id === bId)?.name || 'غير معروف'}:</span>
                                                                <span className="text-success">{amount.toLocaleString()} ج.م</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex-between" style={{ marginBottom: '0.5rem' }}><span className="text-muted" style={{ fontSize: '0.875rem' }}>شهري</span><span className="text-success font-bold">{totalMonthly.toLocaleString()} / {emp.monthlyTarget?.toLocaleString() || 0}</span></div>
                                                <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}><div style={{ background: 'var(--success)', height: '100%', width: `${Math.min(100, (totalMonthly / (emp.monthlyTarget || 1)) * 100)}%` }}></div></div>
                                            </div>
                                            <div className="flex-between" style={{ alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldAlert size={18} className="text-danger" /><span>الخصومات: <strong className="text-danger">{emp.deductions || 0} ج.م</strong></span></div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => { setEditMode(emp.id); setEditData({ deductions: emp.deductions || 0, target: emp.target || 0, monthlyTarget: emp.monthlyTarget || 0, branchId: emp.branchId }); }}>تعديل</button>
                                                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => handleAssignTask(emp.id)}>+ مهمة</button>
                                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setSelectedEmployee(emp)}>تقرير مفصل</button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div>
                    <h3 style={{ marginBottom: '1.5rem' }}>إضافة موظف جديد</h3>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <form onSubmit={handleAddUser}>
                            <div className="form-group"><input required type="text" className="form-input" placeholder="اسم الموظف" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} /></div>
                            <div className="form-group"><input required type="text" className="form-input" placeholder="اسم الدخول (Username)" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} /></div>
                            <div className="form-group"><input required type="text" className="form-input" placeholder="رقم سري (PIN)" value={newUser.pin} onChange={e => setNewUser({ ...newUser, pin: e.target.value })} /></div>
                            <div className="form-group">
                                <select className="form-select" value={newUser.branchId} onChange={(e) => setNewUser({ ...newUser, branchId: e.target.value })} required>
                                    <option value="" disabled>الفرع المعين</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><input required type="number" className="form-input" placeholder="التارجت اليومي" value={newUser.target} onChange={e => setNewUser({ ...newUser, target: e.target.value })} /></div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}><input required type="number" className="form-input" placeholder="التارجت الشهري" value={newUser.monthlyTarget} onChange={e => setNewUser({ ...newUser, monthlyTarget: e.target.value })} /></div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><Plus size={18} /> إنشاء الحساب</button>
                        </form>
                    </div>
                </div>

                {selectedEmployee && (
                    <div className="invoice-modal-overlay" style={{ direction: 'rtl', padding: '1rem' }}>
                        <div className="invoice-modal" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText className="text-gold" /> تقرير مفصل: {selectedEmployee.name}</h3>
                                <button className="btn btn-icon-only btn-outline" onClick={() => setSelectedEmployee(null)}>✕</button>
                            </div>

                            {(() => {
                                const empMonthPrefix = getTodayString().slice(0, 7);
                                const empSalesMonth = sales.filter(s => s.employeeId === selectedEmployee.id && s.date.startsWith(empMonthPrefix));
                                const empTotalRevenue = empSalesMonth.reduce((acc, s) => acc + s.totalPrice, 0);

                                const empProductSales = {};
                                empSalesMonth.forEach(s => {
                                    empProductSales[s.productId] = (empProductSales[s.productId] || 0) + s.grams;
                                });

                                const empAttendanceList = [];
                                Object.entries(attendance).forEach(([date, list]) => {
                                    const record = list.find(a => a.id === selectedEmployee.id);
                                    if (record) {
                                        empAttendanceList.push({ date, time: record.time, location: record.location });
                                    }
                                });
                                empAttendanceList.sort((a, b) => new Date(b.date) - new Date(a.date));

                                return (
                                    <div style={{ display: 'grid', gap: '2rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div className="glass-card" style={{ padding: '1rem', borderRight: '4px solid var(--primary-gold)' }}>
                                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>مبيعات الشهر الحالي</p>
                                                <h3 className="text-gold">{empTotalRevenue.toLocaleString()} ج.م</h3>
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>التارجت: {selectedEmployee.monthlyTarget?.toLocaleString()} ج.م</span>
                                            </div>
                                            <div className="glass-card" style={{ padding: '1rem', borderRight: '4px solid var(--success)' }}>
                                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>أيام الحضور مسجلة</p>
                                                <h3 className="text-success">{empAttendanceList.length} أيام</h3>
                                            </div>
                                            <div className="glass-card" style={{ padding: '1rem', borderRight: '4px solid var(--danger)' }}>
                                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>إجمالي الخصومات</p>
                                                <h3 className="text-danger">{selectedEmployee.deductions || 0} ج.م</h3>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PackageOpen className="text-gold" size={18} /> مبيعات العطور هذا الشهر (بالجرام)</h4>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                                {Object.keys(empProductSales).length === 0 ? <p className="text-muted">لا توجد مبيعات.</p> : (
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                                        <tbody>
                                                            {Object.entries(empProductSales)
                                                                .sort((a, b) => b[1] - a[1])
                                                                .map(([pId, grams]) => (
                                                                    <tr key={pId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td style={{ padding: '0.5rem' }}>{products.find(p => p.id === pId)?.name || 'عطر محذوف'}</td>
                                                                        <td style={{ padding: '0.5rem', color: 'var(--primary-gold)' }}>{grams} ج</td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock className="text-gold" size={18} /> سجل الحضور المفصل</h4>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                                                {empAttendanceList.length === 0 ? <p className="text-muted">لا يوجد سجلات حضور.</p> : (
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                                <th style={{ padding: '0.5rem' }}>التاريخ</th>
                                                                <th style={{ padding: '0.5rem' }}>الوقت</th>
                                                                <th style={{ padding: '0.5rem' }}>الموقع</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {empAttendanceList.map((rec, i) => (
                                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <td style={{ padding: '0.5rem' }}>{rec.date}</td>
                                                                    <td style={{ padding: '0.5rem' }} className="text-success">{rec.time}</td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        {rec.location ? (
                                                                            <a href={`https://www.google.com/maps/search/?api=1&query=${rec.location.lat},${rec.location.lng}`} target="_blank" rel="noreferrer" className="text-main" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                                <MapPin size={14} /> عرض الخريطة
                                                                            </a>
                                                                        ) : <span className="text-muted">غير متوفر</span>}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const AuditsTab = () => {
        const [auditRejections, setAuditRejections] = useState({});
        const [auditEdits, setAuditEdits] = useState({});

        const toggleRejection = (auditId, productId) => {
            setAuditRejections(prev => {
                const current = prev[auditId] || [];
                if (current.includes(productId)) {
                    return { ...prev, [auditId]: current.filter(id => id !== productId) };
                } else {
                    return { ...prev, [auditId]: [...current, productId] };
                }
            });
        };

        const sortedAudits = [...audits].sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (b.status === 'pending' && a.status !== 'pending') return 1;
            return b.timestamp - a.timestamp;
        });

        const handleEditChange = (auditId, productId, value) => {
            setAuditEdits(prev => ({
                ...prev,
                [auditId]: {
                    ...(prev[auditId] || {}),
                    [productId]: value
                }
            }));
        };

        if (sortedAudits.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                    <p className="text-muted" style={{ fontSize: '1.25rem' }}>لم يقم أي فرع بتسليم الجرد بعد.</p>
                </div>
            );
        }

        return (
            <div className="animate-fade-in" style={{ display: 'grid', gap: '1.5rem' }}>
                {sortedAudits.map(audit => {
                    const emp = users.find(u => u.id === audit.employeeId);
                    const branch = branches.find(b => b.id === audit.branchId);
                    const dateStr = new Date(audit.timestamp).toLocaleString('ar-EG');

                    return (
                        <div key={audit.id} className="glass-card" style={{ padding: '1.5rem', borderRight: audit.status === 'pending' ? '4px solid var(--warning)' : audit.status === 'approved' ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
                            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '1.25rem' }}>جرد مقدم من {emp?.name} ({branch?.name})</h4>
                                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>التاريخ: {dateStr}</p>
                                </div>
                                <div>
                                    {audit.status === 'pending' ? <span className="badge badge-gold">بانتظار المراجعة</span>
                                        : audit.status === 'approved' ? <span className="badge badge-success">تم الاعتماد</span>
                                            : <span className="badge badge-danger">مرفوض</span>}
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>العطر</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>المسجل بالنظام</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>الفعلي بالفرع</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>العجز / الزيادة</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>الاعتماد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audit.items.map(item => {
                                            const p = products.find(p => p.id === item.productId);

                                            // Determine current status
                                            const isPending = audit.status === 'pending';
                                            const isRejected = isPending
                                                ? (auditRejections[audit.id] || []).includes(item.productId)
                                                : audit.status === 'rejected' ? true : (audit.rejectedItems || []).includes(item.productId);

                                            const currentEdit = auditEdits[audit.id]?.[item.productId];
                                            const displayGrams = isPending ? (currentEdit !== undefined ? Number(currentEdit) : item.countedGrams) : (item.finalCountedGrams !== undefined ? item.finalCountedGrams : item.countedGrams);

                                            const diff = displayGrams - item.expectedGrams;
                                            const hasDiscrepancy = diff !== 0;

                                            return (
                                                <tr key={item.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: isRejected ? 0.6 : 1, background: isRejected ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 500, color: isRejected ? 'var(--danger)' : 'inherit', textDecoration: isRejected ? 'line-through' : 'none' }}>{p?.name || 'غير معروف'}</td>
                                                    <td style={{ padding: '1rem' }}>{item.expectedGrams} ج</td>
                                                    <td style={{ padding: '1rem', fontWeight: 600 }}>
                                                        {isPending && !isRejected ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <input
                                                                    type="number"
                                                                    className="form-input"
                                                                    style={{ width: '80px', padding: '0.25rem' }}
                                                                    min="0"
                                                                    value={currentEdit !== undefined ? currentEdit : item.countedGrams}
                                                                    onChange={(e) => handleEditChange(audit.id, item.productId, e.target.value)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span>{displayGrams} ج</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1rem', color: !hasDiscrepancy ? 'var(--success)' : 'var(--danger)', fontWeight: hasDiscrepancy ? 'bold' : 'normal', direction: 'ltr', textAlign: 'right' }}>
                                                        {diff > 0 ? `+${diff}` : diff} ج
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        {isPending ? (
                                                            <button
                                                                className={`btn btn-icon-only ${isRejected ? 'btn-outline' : 'btn-primary'}`}
                                                                style={{ padding: '0.25rem', borderRadius: '50%', background: isRejected ? 'transparent' : 'var(--success)', border: isRejected ? '1px solid var(--danger)' : 'none', color: isRejected ? 'var(--danger)' : '#000' }}
                                                                onClick={() => toggleRejection(audit.id, item.productId)}
                                                                title={isRejected ? 'تفعيل واعتماد هذا العطر' : 'رفض عدم اعتماد هذا العطر'}
                                                            >
                                                                {isRejected ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                            </button>
                                                        ) : (
                                                            <span>{isRejected ? <XCircle className="text-danger" size={18} /> : <CheckCircle className="text-success" size={18} />}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {audit.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                        مرفوض: <strong className="text-danger">{(auditRejections[audit.id] || []).length}</strong> | معتمد تحديثه: <strong className="text-success">{audit.items.length - (auditRejections[audit.id] || []).length}</strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => rejectAudit(audit.id)}>
                                            <XCircle size={18} /> رفض الجرد بالكامل
                                        </button>
                                        <button className="btn btn-primary" style={{ background: 'var(--success)', color: '#000' }} onClick={() => approveAudit(audit.id, auditRejections[audit.id] || [], auditEdits[audit.id] || {})}>
                                            <CheckCircle size={18} /> اعتماد وتحديث الخزينة
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        );
    };

    const SuppliesTab = () => {
        const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');

        if (!selectedBranchId) return <p className="text-muted">لا يوجد فروع مسجلة.</p>;

        const handleStockUpdate = (supplyId, e) => {
            updateSupplyStock(supplyId, selectedBranchId, e.target.value);
        };

        return (
            <div className="animate-fade-in">
                <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PackageOpen className="text-gold" /> جرد الخامات والعبوات المستقل</h3>
                    <div>
                        <select className="form-select" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', minWidth: '200px' }}>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>نوع الخامة / العبوة</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>التصنيف</th>
                                <th style={{ padding: '1rem', color: 'var(--text-muted)', width: '200px' }}>الرصيد الفعلي بالفرع</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supplies.map(s => {
                                const stockVal = s.branchStock?.[selectedBranchId] || 0;
                                return (
                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500 }}>{s.name}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {s.type === 'alcohol' ? <span className="badge badge-primary">كحول</span>
                                                : s.type === 'bags' ? <span className="badge badge-gold">أكياس</span>
                                                    : <span className="badge badge-success">عبوات زجاجية</span>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={stockVal}
                                                onChange={(e) => handleStockUpdate(s.id, e)}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', direction: 'rtl' }}>
            <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h2 style={{ color: "red" }}>TEST FIREBASE</h2>
                    <p className="text-muted">نظام إدارة المركز الرئيسي لعطورسياج</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('overview')}><BarChart3 size={18} /> نظرة عامة</button>
                <button className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('inventory')}><PackageOpen size={18} /> الخزينة والمنتجات</button>
                <button className={`btn ${activeTab === 'branchInventory' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('branchInventory')}><PackageOpen size={18} /> مخازن الفروع</button>
                <button className={`btn ${activeTab === 'supplies' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('supplies')}><PackageOpen size={18} /> الخامات والعبوات</button>
                <button className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('employees')}><Users size={18} /> الموظفين</button>
                <button className={`btn ${activeTab === 'audits' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('audits')} style={{ position: 'relative' }}>
                    <FileText size={18} /> الجرد اليدوي
                    {pendingAuditsCount > 0 && (
                        <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{pendingAuditsCount}</span>
                    )}
                </button>
            </div>

            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'inventory' && <InventoryTab />}
            {activeTab === 'branchInventory' && <BranchInventoryTab />}
            {activeTab === 'supplies' && <SuppliesTab />}
            {activeTab === 'employees' && <EmployeesTab />}
            {activeTab === 'audits' && <AuditsTab />}
        </div>
    );
};

export default ManagerDashboard;
