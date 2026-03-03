import React from 'react';
import { useApp } from '../context/AppContext';

const Invoice = ({ sale, onClose }) => {
    const { products, currentUser, branches } = useApp();

    if (!sale) return null;

    const product = products.find(p => p.id === sale.productId);
    const branchInfo = branches.find(b => b.id === currentUser.branchId);
    const dateStr = new Date(sale.timestamp).toLocaleString('ar-EG');

    return (
        <>
            {/* Modal Overlay / Wrapper */}
            <div className="invoice-modal-overlay" style={{ direction: 'rtl' }}>
                <div className="invoice-modal">

                    <div className="flex-between" style={{ marginBottom: '1rem' }} id="no-print">
                        <h3 style={{ margin: 0 }}>طباعة الفاتورة</h3>
                        <button className="btn btn-icon-only btn-outline" onClick={onClose} style={{ padding: '0.25rem' }}>✕</button>
                    </div>

                    {/* Printable Area */}
                    <div className="printable-receipt" id="printable-area" style={{ direction: 'rtl' }}>
                        <div className="receipt-header">
                            <h2>سياج للعطور</h2>
                            <p>{branchInfo?.name || 'فرع المتجر'}</p>
                            <p className="receipt-date">{dateStr}</p>
                            <div className="receipt-divider"></div>
                        </div>

                        <div className="receipt-body">
                            <div className="receipt-row receipt-bold">
                                <span>الصنف</span>
                                <span>الإجمالي</span>
                            </div>
                            <div className="receipt-row">
                                <span className="item-name">{product?.name || 'عطر'} ({sale.grams} جرام / {sale.bottleType})</span>
                                <span>{sale.totalPrice.toLocaleString()} ج.م</span>
                            </div>

                            <div className="receipt-divider"></div>

                            <div className="receipt-row receipt-total">
                                <span>الإجمالي</span>
                                <span>{sale.totalPrice.toLocaleString()} ج.م</span>
                            </div>
                        </div>

                        <div className="receipt-footer">
                            <p>البائع: {sale.employeeId === currentUser.id ? currentUser.name : 'موظف'}</p>
                            <p>شكراً لتسوقكم معنا!</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }} id="no-print">
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
                            🖨️ طباعة الفاتورة
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default Invoice;
