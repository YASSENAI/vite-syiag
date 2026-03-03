import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, DollarSign, Target, Plus, AlertCircle, Calendar, Printer, FileText } from 'lucide-react';
import Invoice from '../components/Invoice';

const SearchableSelect = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = isOpen ? search : (selectedOption ? selectedOption.label : '');

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                type="text"
                className="form-input"
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => {
                    setSearch(e.target.value);
                    if (!isOpen) setIsOpen(true);
                    if (value) onChange('');
                }}
                onFocus={() => {
                    setIsOpen(true);
                    setSearch('');
                }}
            />
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                        <div
                            key={opt.value}
                            style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                                setSearch('');
                            }}
                            className="hover-row"
                        >
                            <span>{opt.label}</span>
                        </div>
                    )) : (
                        <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>لا توجد نتائج</div>
                    )}
                </div>
            )}
        </div>
    );
};

const EmployeeDashboard = () => {
    const {
        currentUser, products, branches, bottles, audits, auditTasks, employeeTasks, addSale,
        getSalesByEmployee, getTodayString, markAttendance, supplies,
        checkAttendance, getUserAttendanceCount, submitAudit, resolveAuditTask, completeEmployeeTask
    } = useApp();

    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedBottle, setSelectedBottle] = useState('');
    const [grams, setGrams] = useState('');
    const [customPrice, setCustomPrice] = useState('');

    // Manual Supplies
    const [alcoholUsed, setAlcoholUsed] = useState('');
    const [bagUsed, setBagUsed] = useState('');

    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Invoice state
    const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState(null);

    // Tabs
    const [activeTab, setActiveTab] = useState('sales');

    const today = getTodayString();
    const sales = getSalesByEmployee(currentUser.id);
    const todaySales = sales.filter(s => s.date === today);

    const todaySalesValue = todaySales.reduce((acc, sale) => acc + sale.totalPrice, 0);
    const totalGramsSold = todaySales.reduce((acc, sale) => acc + sale.grams, 0);

    // Targets
    const dailyProgress = Math.min(100, Math.round((todaySalesValue / currentUser.target) * 100)) || 0;

    // Calculate Monthly Sales
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const monthlySales = sales.filter(s => s.date.startsWith(currentMonth));
    const monthlySalesValue = monthlySales.reduce((acc, sale) => acc + sale.totalPrice, 0);
    const monthlyProgress = Math.min(100, Math.round((monthlySalesValue / (currentUser.monthlyTarget || 1)) * 100)) || 0;

    // Calculate Bonus
    const bonusRate = currentUser.targetBonusRate || 0;
    const isTargetHit = monthlySalesValue >= currentUser.monthlyTarget;
    const bonusValue = isTargetHit ? (monthlySalesValue * bonusRate) : 0;

    const branchName = branches.find(b => b.id === currentUser.branchId)?.name;
    const isPresent = checkAttendance();
    const attendanceDays = getUserAttendanceCount(currentUser.id);

    const handleAddSale = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!selectedProduct || !grams || !selectedBottle || !customPrice) {
            return setError('يرجى تعبئة جميع الحقول المطلوبة للعطر');
        }

        const gramsNum = Number(grams);
        if (gramsNum <= 0) return setError('عدد الجرامات يجب أن يكون أكبر من الصفر');

        const result = addSale(selectedProduct, gramsNum, selectedBottle, customPrice, Number(alcoholUsed) || 0, bagUsed);
        if (result.success) {
            setSuccessMsg(`تم تسجيل بيع ${gramsNum} جرام بنجاح`);
            setGrams(''); setSelectedProduct(''); setSelectedBottle(''); setCustomPrice('');
            setAlcoholUsed(''); setBagUsed('');
            setTimeout(() => setSuccessMsg(''), 3000);

            // Auto-open invoice for printer
            const newSale = getSalesByEmployee(currentUser.id).slice(-1)[0];
            setSelectedSaleForInvoice(newSale);
        } else {
            setError(result.msg || 'فشل في إضافة عملية البيع');
        }
    };

    const AuditTab = () => {
        const [auditCounts, setAuditCounts] = useState({});
        const [auditSuccess, setAuditSuccess] = useState('');

        // Check if audit already submitted today
        const hasPendingAudit = audits.find(a => a.employeeId === currentUser.id && a.date === today && a.status === 'pending');

        const handleAuditSubmit = (e) => {
            e.preventDefault();
            const items = products.map(p => {
                const bStock = p.branchStock?.[currentUser.branchId] || 0;
                return {
                    productId: p.id,
                    expectedGrams: bStock,
                    countedGrams: Number(auditCounts[p.id] || 0)
                };
            });

            submitAudit(items);
            resolveAuditTask(currentUser.branchId);
            setAuditSuccess('تم إرسال الجرد بنجاح للمدير لاعتماده');
        };

        if (hasPendingAudit) {
            return (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <CheckCircle size={48} className="text-success" style={{ margin: '0 auto 1rem' }} />
                    <h3>تم إرسال الجرد الأخير</h3>
                    <p className="text-muted">تم إرسال جرد المخزون الخاص بك إلى المدير وهو قيد المراجعة حالياً.</p>
                </div>
            );
        }

        return (
            <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText className="text-gold" /> جرد المخزون (الفرع)
                </h3>
                {auditSuccess ? (
                    <p className="text-success" style={{ padding: '1rem', background: 'rgba(76,217,100,0.1)', borderRadius: '8px' }}>{auditSuccess}</p>
                ) : (
                    <form onSubmit={handleAuditSubmit}>
                        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>أدخل الجرامات الفعلية المتوفرة حالياً في الفرع لكل عطر.</p>

                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                            {products.map(p => (
                                <div key={p.id} className="flex-between" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="number" min="0" required
                                            className="form-input"
                                            style={{ width: '100px', padding: '0.5rem' }}
                                            placeholder="الأرقام"
                                            value={auditCounts[p.id] || ''}
                                            onChange={e => setAuditCounts({ ...auditCounts, [p.id]: e.target.value })}
                                        />
                                        <span className="text-muted">جرام</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>إرسال الجرد للمدير</button>
                    </form>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', direction: 'rtl' }}>

            {/* Header Info */}
            {auditTasks.includes(currentUser.branchId) && (
                <div style={{ background: 'var(--danger)', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} />
                    <strong>تنبيه هام:</strong> المدير يطلب منك تسجيل جرد العطور الفعلي للفرع اليوم قبل المغادرة. يرجى الذهاب لتبويب "جرد المخزون".
                </div>
            )}

            {employeeTasks.filter(t => t.employeeId === currentUser.id && t.status === 'pending').map(task => (
                <div key={task.id} style={{ background: 'rgba(79, 172, 254, 0.2)', border: '1px solid #4facfe', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} style={{ color: '#4facfe' }} />
                        <span style={{ fontSize: '0.9rem' }}>
                            <strong>مهمة إدارية جديدة:</strong> {task.text}
                        </span>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '0.25rem 1rem', fontSize: '0.8rem', background: '#4facfe', borderColor: '#4facfe' }} onClick={() => completeEmployeeTask(task.id)}>
                        <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /> تم التنفيذ
                    </button>
                </div>
            ))}

            <div className="flex-between" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ marginBottom: '0.25rem' }}>مرحباً، {currentUser.name}</h2>
                    <p className="text-muted">الفرع: <strong className="text-main">{branchName}</strong></p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem' }}>
                        <span className="text-muted">أيام الحضور: <strong className="text-main">{attendanceDays}</strong></span>
                        {currentUser.deductions > 0 && (
                            <span className="text-danger">الخصومات: <strong>{currentUser.deductions} ج.م</strong></span>
                        )}
                    </div>

                    {!isPresent ? (
                        <button
                            onClick={() => {
                                if ('geolocation' in navigator) {
                                    navigator.geolocation.getCurrentPosition(
                                        (position) => {
                                            markAttendance({ lat: position.coords.latitude, lng: position.coords.longitude });
                                        },
                                        (error) => {
                                            alert('لم يتم السماح بالوصول للموقع. تسجيل الحضور يتطلب تفعيل الموقع الجغرافي. يرجى السماح للمتصفح بالوصول لموقعك الجغرافي.');
                                        },
                                        { enableHighAccuracy: true }
                                    );
                                } else {
                                    alert('متصفحك لا يدعم تحديد الموقع.');
                                }
                            }}
                            className="btn btn-primary animate-fade-in"
                        >
                            <Calendar size={18} /> تسجيل الحضور
                        </button>
                    ) : (
                        <div className="badge badge-success animate-fade-in" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            <CheckCircle size={16} style={{ marginLeft: '0.5rem' }} /> تم التسجيل اليوم
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('sales')}>
                    <DollarSign size={18} /> المبيعات واليومية
                </button>
                <button className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('audit')}>
                    <FileText size={18} /> جرد المخزون
                </button>
            </div>

            {activeTab === 'sales' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>

                        {/* Targets Card */}
                        <div className="glass-card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
                            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target className="text-gold" /> أهداف المبيعات (التارجت)</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                                <div>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>التارجت اليومي: {currentUser.target?.toLocaleString()} ج.م</p>
                                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                        <h3 className="text-gold">{todaySalesValue.toLocaleString()} ج.م</h3>
                                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>{dailyProgress}%</span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ background: 'var(--primary-gold)', height: '100%', width: `${dailyProgress}%`, transition: 'width 0.5s ease-out' }}></div>
                                    </div>
                                </div>

                                <div style={{ paddingRight: '1rem', borderRight: '1px solid var(--border-color)' }}>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>التارجت الشهري: {currentUser.monthlyTarget?.toLocaleString()} ج.م</p>
                                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                        <h3 className="text-main">{monthlySalesValue.toLocaleString()} ج.م</h3>
                                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>{monthlyProgress}%</span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ background: 'var(--success)', height: '100%', width: `${monthlyProgress}%`, transition: 'width 0.5s ease-out' }}></div>
                                    </div>

                                    {bonusRate > 0 && (
                                        <div style={{ marginTop: '1.5rem', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', padding: '1rem', borderRadius: '8px' }}>
                                            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                                <span className="text-gold" style={{ fontSize: '0.875rem' }}>البونص الشهري (المتوقع):</span>
                                                <span className="text-gold font-bold">نسبة {bonusRate * 100}%</span>
                                            </div>
                                            <h3 className="text-success" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                                {isTargetHit ? `+ ${bonusValue.toLocaleString()} ج.م` : 'لم يتم تحقيق التارجت بعد'}
                                            </h3>
                                            <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem' }}>يُحسب البونص فقط بعد تخطي حاجز التارجت الشهري.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Add Sale Card */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={20} className="text-gold" /> تسجيل فاتورة جديدة
                            </h3>

                            <form onSubmit={handleAddSale}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>الصنف (العطر)</label>
                                    <SearchableSelect
                                        options={products.map(p => ({ value: p.id, label: p.name }))}
                                        value={selectedProduct}
                                        onChange={setSelectedProduct}
                                        placeholder="بحث عن عطر..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>نوع الزجاجة</label>
                                    <SearchableSelect
                                        options={bottles.map(b => ({ value: b, label: b }))}
                                        value={selectedBottle}
                                        onChange={setSelectedBottle}
                                        placeholder="بحث عن زجاجة..."
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px', color: 'var(--accent-gold)' }}>الكحول المستخدم (اختياري)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" className="form-input" placeholder="مثال: 15" value={alcoholUsed} onChange={(e) => setAlcoholUsed(e.target.value)} min="0" />
                                            <span className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}>جرام</span>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px', color: 'var(--accent-gold)' }}>الشنطة المستخدمة (اختياري)</label>
                                        <select className="form-select" value={bagUsed} onChange={(e) => setBagUsed(e.target.value)} style={{ padding: '0.5rem' }}>
                                            <option value="">لا يوجد / غير مستخدم</option>
                                            {supplies.filter(s => s.type === 'bags').map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-muted" style={{ gridColumn: '1 / -1', fontSize: '0.75rem', marginTop: '0.5rem' }}>* لن تظهر هذه البيانات في فاتورة العميل، بل تستخدم لإدارة المخزون من قبل المدير.</p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>الكمية بالجرامات</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" className="form-input" placeholder="مثال: 50" value={grams} onChange={(e) => setGrams(e.target.value)} min="1" required />
                                            <span className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}>جرام</span>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>السعر الكلي</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" className="form-input" placeholder="السعر للفاتورة" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} min="1" required />
                                            <span className="text-muted" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}>ج.م</span>
                                        </div>
                                    </div>
                                </div>

                                {error && <p className="text-danger" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}><AlertCircle size={14} style={{ verticalAlign: 'middle' }} /> {error}</p>}
                                {successMsg && <p className="text-success" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}><CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> {successMsg}</p>}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>تسجيل الفاتورة وإصدارها</button>
                            </form>
                        </div>
                    </div>

                    {/* Detailed Daybook */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3>يومية المبيعات (اليوم)</h3>
                            <div className="badge badge-gold">إجمالي المباع اليوم: {totalGramsSold} جرام</div>
                        </div>

                        {todaySales.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                <p className="text-muted">لم يتم تسجيل أي مبيعات اليوم حتى الآن.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>الوقت والتاريخ</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>العطر</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>الزجاجة</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>الكمية</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>السعر المباع</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>الفاتورة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todaySales.map(s => {
                                            const product = products.find(p => p.id === s.productId);
                                            const tDate = new Date(s.timestamp);
                                            return (
                                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ fontWeight: 500 }}>{tDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{tDate.toLocaleDateString('ar-EG')}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary-gold)' }}>{product?.name || 'غير معروف'}</td>
                                                    <td style={{ padding: '1rem' }}>{s.bottleType}</td>
                                                    <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>{s.grams} ج</span></td>
                                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{s.totalPrice.toLocaleString()} ج.م</td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button className="btn btn-outline btn-icon-only" onClick={() => setSelectedSaleForInvoice(s)} title="طباعة الفاتورة">
                                                            <Printer size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        }).reverse()}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'audit' && <AuditTab />}

            {/* Invoice Modal */}
            {selectedSaleForInvoice && (
                <Invoice sale={selectedSaleForInvoice} onClose={() => setSelectedSaleForInvoice(null)} />
            )}

        </div>
    );
};

export default EmployeeDashboard;
