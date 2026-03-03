import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const BOTTLE_TYPES = [
    "20 مل عادي", "30 مل عادي", "50 مل عادي", "100 مل عادي",
    "30 مل شكل", "50 مل شكل", "100 مل شكل",
    "30 مل كبسولة",
    "30 مل استاندر", "50 مل استاندر", "100 مل استاندر",
    "توله 3", "توله 5", "توله 6", "توله 7", "توله 8", "توله 12", "تولة شكل"
];

// Helper to get today's date string YYYY-MM-DD
const getTodayString = () => new Date().toISOString().split('T')[0];

export const AppProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Context states synced from Firestore
    const [branches, setBranches] = useState([]);
    const [bottles, setBottles] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [sales, setSales] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [audits, setAudits] = useState([]);
    const [auditTasks, setAuditTasks] = useState([]);
    const [employeeTasks, setEmployeeTasks] = useState([]);

    useEffect(() => {
        // Initial setup and DB migration if empty
        const initDB = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            if (usersSnap.empty) {
                console.log("Database empty. Migrating from localStorage to Firestore...");
                const batch = writeBatch(db);

                const localUsers = JSON.parse(localStorage.getItem('users')) || [];
                const localProducts = JSON.parse(localStorage.getItem('products')) || [];
                const localSupplies = JSON.parse(localStorage.getItem('supplies')) || [];
                const localSales = JSON.parse(localStorage.getItem('sales')) || [];
                const localAttendance = JSON.parse(localStorage.getItem('attendance')) || {};
                const localAudits = JSON.parse(localStorage.getItem('audits')) || [];
                const localAuditTasks = JSON.parse(localStorage.getItem('auditTasks')) || [];
                const localEmployeeTasks = JSON.parse(localStorage.getItem('employeeTasks')) || [];

                localUsers.forEach(u => batch.set(doc(db, 'users', u.id), u));
                localProducts.forEach(p => batch.set(doc(db, 'products', p.id), p));
                localSupplies.forEach(s => batch.set(doc(db, 'supplies', s.id), s));
                localSales.forEach(s => batch.set(doc(db, 'sales', s.id), s));
                localAudits.forEach(a => batch.set(doc(db, 'audits', a.id), a));

                batch.set(doc(db, 'system', 'attendance'), localAttendance);
                batch.set(doc(db, 'system', 'auditTasks'), { tasks: localAuditTasks });

                localEmployeeTasks.forEach(t => batch.set(doc(db, 'employeeTasks', t.id), t));

                // Mocks are seeded if everything is completely blank (first ever deploy case fallback)
                const MOCK_BRANCHES = [
                    { id: 'b1', name: 'محل حلوان' },
                    { id: 'b2', name: 'حلوان البنك' },
                    { id: 'b3', name: 'حلوان البيت السوري' },
                    { id: 'b4', name: 'حلوان الشارع الرئيسي' },
                    { id: 'b5', name: 'عزبة النخل' }
                ];
                MOCK_BRANCHES.forEach(b => batch.set(doc(db, 'branches', b.id), b));
                batch.set(doc(db, 'system', 'bottles'), { types: Object.values(BOTTLE_TYPES) });

                await batch.commit();
                console.log("Migration complete!");
            }
        };

        initDB().then(() => {
            // Setup real-time listeners mapping Collections to States
            const unsubUsers = onSnapshot(collection(db, 'users'), snapshot => setUsers(snapshot.docs.map(d => d.data())));
            const unsubProducts = onSnapshot(collection(db, 'products'), snapshot => setProducts(snapshot.docs.map(d => d.data())));
            const unsubSupplies = onSnapshot(collection(db, 'supplies'), snapshot => setSupplies(snapshot.docs.map(d => d.data())));
            const unsubSales = onSnapshot(collection(db, 'sales'), snapshot => setSales(snapshot.docs.map(d => d.data())));
            const unsubAudits = onSnapshot(collection(db, 'audits'), snapshot => setAudits(snapshot.docs.map(d => d.data())));
            const unsubBranches = onSnapshot(collection(db, 'branches'), snapshot => setBranches(snapshot.docs.map(d => d.data())));
            const unsubEmpTasks = onSnapshot(collection(db, 'employeeTasks'), snapshot => setEmployeeTasks(snapshot.docs.map(d => d.data())));

            const unsubAttendance = onSnapshot(doc(db, 'system', 'attendance'), doc => setAttendance(doc.exists() ? doc.data() : {}));
            const unsubAuditTasks = onSnapshot(doc(db, 'system', 'auditTasks'), doc => setAuditTasks(doc.exists() ? doc.data().tasks : []));
            const unsubBottles = onSnapshot(doc(db, 'system', 'bottles'), doc => setBottles(doc.exists() ? doc.data().types : BOTTLE_TYPES));

            setLoading(false);

            return () => {
                unsubUsers(); unsubProducts(); unsubSupplies(); unsubSales(); unsubAudits(); unsubBranches(); unsubEmpTasks();
                unsubAttendance(); unsubAuditTasks(); unsubBottles();
            };
        });
    }, []);

    // Actions
    const login = (username, pin) => {
        const user = users.find(u => u.username === username && String(u.pin) === String(pin));
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    };

    const logout = () => setCurrentUser(null);

    const addSale = async (productId, grams, bottleType, totalPrice, manualAlcoholUsed = 0, manualBagUsed = '') => {
        if (!currentUser || currentUser.role !== 'employee') return { error: 'غير مصرح' };

        const product = products.find(p => p.id === productId);
        if (product) {
            const currentStock = product.branchStock?.[currentUser.branchId] || 0;
            await updateDoc(doc(db, 'products', productId), {
                [`branchStock.${currentUser.branchId}`]: currentStock - Number(grams)
            });
        }

        // Deduct Supplies: Manual bag (or auto), 1 Bottle, and manual/calculated Alcohol
        let bagId = manualBagUsed || 'bags';
        const bag = supplies.find(s => s.id === bagId);
        if (bag) {
            const currentBagStock = bag.branchStock?.[currentUser.branchId] || 0;
            await updateDoc(doc(db, 'supplies', bagId), {
                [`branchStock.${currentUser.branchId}`]: currentBagStock - 1
            });
        }

        const bottleSupply = supplies.find(s => s.name === bottleType && s.type === 'bottle');
        if (bottleSupply) {
            const currentBotStock = bottleSupply.branchStock?.[currentUser.branchId] || 0;
            await updateDoc(doc(db, 'supplies', bottleSupply.id), {
                [`branchStock.${currentUser.branchId}`]: currentBotStock - 1
            });
        }

        const alcoholSupply = supplies.find(s => s.id === 'alcohol');
        if (alcoholSupply) {
            const sizeMatch = bottleType.match(/\d+/);
            const bottleSize = sizeMatch ? parseInt(sizeMatch[0]) : 0;
            const autoAlcoholDeduction = Math.max(0, bottleSize - Number(grams));
            const finalAlcoholDeduction = manualAlcoholUsed > 0 ? manualAlcoholUsed : autoAlcoholDeduction;
            const currentAlcStock = alcoholSupply.branchStock?.[currentUser.branchId] || 0;
            await updateDoc(doc(db, 'supplies', 'alcohol'), {
                [`branchStock.${currentUser.branchId}`]: currentAlcStock - finalAlcoholDeduction
            });
        }

        const saleId = Date.now().toString();
        const newSale = {
            id: saleId,
            productId,
            grams: Number(grams),
            bottleType,
            totalPrice: Number(totalPrice),
            branchId: currentUser.branchId,
            employeeId: currentUser.id,
            date: getTodayString(),
            timestamp: Date.now(),
            manualAlcoholUsed: manualAlcoholUsed > 0 ? manualAlcoholUsed : null,
            manualBagUsed: manualBagUsed || null
        };

        await setDoc(doc(db, 'sales', saleId), newSale);
        return { success: true };
    };

    const updateSale = async (saleId, newGrams, newPrice) => {
        await updateDoc(doc(db, 'sales', saleId), {
            grams: Number(newGrams),
            totalPrice: Number(newPrice)
        });
    };

    const markAttendance = async (location = null) => {
        if (!currentUser) return;
        const today = getTodayString();
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

        const todayList = attendance[today] || [];
        if (!todayList.find(a => a.id === currentUser.id)) {
            const newList = [...todayList, { id: currentUser.id, time: timeStr, location }];
            await setDoc(doc(db, 'system', 'attendance'), { [today]: newList }, { merge: true });
        }
    };

    const checkAttendance = () => {
        if (!currentUser) return false;
        const today = getTodayString();
        return (attendance[today] || []).some(a => a.id === currentUser.id);
    };

    const getUserAttendanceCount = (userId) => {
        return Object.values(attendance).filter(list => list.some(a => a.id === userId)).length;
    };

    const getBranchAttendanceToday = (branchUsers) => {
        const today = getTodayString();
        const list = attendance[today] || [];
        return branchUsers.map(u => {
            const record = list.find(a => a.id === u.id);
            return { user: u, time: record ? record.time : null, location: record ? record.location : null };
        });
    };

    const submitAudit = async (items) => {
        if (!currentUser || currentUser.role !== 'employee') return false;
        const newId = Date.now().toString();
        const newAudit = {
            id: newId,
            employeeId: currentUser.id,
            branchId: currentUser.branchId,
            date: getTodayString(),
            timestamp: Date.now(),
            status: 'pending',
            items
        };
        await setDoc(doc(db, 'audits', newId), newAudit);
        return true;
    };

    // Manager Actions
    const addProduct = async (name, pricePerGram) => {
        const newId = `p${Date.now()}`;
        const newProduct = {
            id: newId,
            name,
            stockGrams: 0,
            branchStock: {},
            pricePerGram: Number(pricePerGram)
        };
        await setDoc(doc(db, 'products', newId), newProduct);
    };

    const addProductsBulk = async (productsArray) => {
        const batch = writeBatch(db);
        productsArray.forEach((p, i) => {
            const newId = `p${Date.now()}_${i}`;
            batch.set(doc(db, 'products', newId), {
                id: newId,
                name: p.name,
                pricePerGram: p.pricePerGram,
                stockGrams: p.stockGrams || 0,
                branchStock: {}
            });
        });
        await batch.commit();
    };

    const addUser = async (userData) => {
        const newId = `u${Date.now()}`;
        const newUser = {
            id: newId,
            ...userData,
            role: 'employee',
            deductions: 0
        };
        await setDoc(doc(db, 'users', newId), newUser);
    };

    const updateProductStock = async (id, newStock) => {
        await updateDoc(doc(db, 'products', id), { stockGrams: Number(newStock) });
    };

    const updateUserDeductions = async (userId, amount) => {
        await updateDoc(doc(db, 'users', userId), { deductions: Number(amount) });
    };

    const updateUserTargets = async (userId, daily, monthly) => {
        await updateDoc(doc(db, 'users', userId), { target: Number(daily), monthlyTarget: Number(monthly) });
    };

    const approveAudit = async (auditId, rejectedProductIds = [], editedCounts = {}) => {
        const audit = audits.find(a => a.id === auditId);
        if (!audit) return;

        const batch = writeBatch(db);
        let newItems = [...audit.items];

        audit.items.forEach((item, index) => {
            const finalCount = editedCounts[item.productId] !== undefined ? Number(editedCounts[item.productId]) : item.countedGrams;
            newItems[index] = { ...item, finalCountedGrams: finalCount };

            if (!rejectedProductIds.includes(item.productId)) {
                batch.update(doc(db, 'products', item.productId), {
                    [`branchStock.${audit.branchId}`]: finalCount
                });
            }
        });

        batch.update(doc(db, 'audits', auditId), {
            status: 'approved',
            rejectedItems: rejectedProductIds,
            items: newItems
        });

        await batch.commit();
    };

    const rejectAudit = async (auditId) => {
        await updateDoc(doc(db, 'audits', auditId), { status: 'rejected' });
    };

    const getSalesByBranch = (branchId, dateStr = null) => {
        return sales.filter(s => s.branchId === branchId && (!dateStr || s.date === dateStr));
    };

    const getSalesByEmployee = (employeeId) => {
        return sales.filter(s => s.employeeId === employeeId);
    };

    const getInactiveProducts = () => {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        return products.filter(p => {
            const pSales = sales.filter(s => s.productId === p.id);
            if (pSales.length === 0) return true;
            const latestSaleStamp = Math.max(...pSales.map(s => s.timestamp));
            return latestSaleStamp < fourteenDaysAgo.getTime();
        });
    };

    const assignAuditTask = async (branchId) => {
        if (!auditTasks.includes(branchId)) {
            const newTasks = [...auditTasks, branchId];
            await setDoc(doc(db, 'system', 'auditTasks'), { tasks: newTasks }, { merge: true });
        }
    };

    const resolveAuditTask = async (branchId) => {
        const newTasks = auditTasks.filter(b => b !== branchId);
        await setDoc(doc(db, 'system', 'auditTasks'), { tasks: newTasks }, { merge: true });
    };

    const updateBranchStock = async (productId, branchId, newStock) => {
        await updateDoc(doc(db, 'products', productId), {
            [`branchStock.${branchId}`]: Number(newStock)
        });
    };

    const updateUserBonus = async (userId, bonusRate) => {
        await updateDoc(doc(db, 'users', userId), { targetBonusRate: Number(bonusRate) });
    };

    const updateUserBranch = async (userId, newBranchId) => {
        await updateDoc(doc(db, 'users', userId), { branchId: newBranchId });
    };

    const updateSupplyStock = async (supplyId, branchId, newStock) => {
        await updateDoc(doc(db, 'supplies', supplyId), {
            [`branchStock.${branchId}`]: Number(newStock)
        });
    };

    const assignEmployeeTask = async (employeeId, text) => {
        const newId = Date.now().toString();
        const newTask = {
            id: newId,
            employeeId,
            text,
            status: 'pending',
            timestamp: Date.now()
        };
        await setDoc(doc(db, 'employeeTasks', newId), newTask);
    };

    const completeEmployeeTask = async (taskId) => {
        await updateDoc(doc(db, 'employeeTasks', taskId), { status: 'completed' });
    };

    const getEmployeeTasks = (employeeId) => {
        return employeeTasks.filter(t => t.employeeId === employeeId);
    };

    const value = { currentUser, branches, bottles, products, users, sales, attendance, audits, auditTasks, employeeTasks, supplies, login, logout, addSale, updateSale, assignAuditTask, resolveAuditTask, assignEmployeeTask, completeEmployeeTask, getEmployeeTasks, markAttendance, checkAttendance, getUserAttendanceCount, getBranchAttendanceToday, submitAudit, addProduct, addProductsBulk, addUser, updateProductStock, updateUserDeductions, updateUserTargets, approveAudit, rejectAudit, getSalesByBranch, getSalesByEmployee, getInactiveProducts, getTodayString, updateBranchStock, updateUserBonus, updateUserBranch, updateSupplyStock };

    // Global Loading Screen while DB connection initializes
    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', background: '#1e222b', color: '#dfb776', fontFamily: 'Outfit' }}>
                <div className="loader" style={{ width: '40px', height: '40px', border: '4px solid rgba(223, 183, 118, 0.3)', borderTop: '4px solid #dfb776', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <h3>جاري تحميل النظام وربط قاعدة البيانات التزامنية...</h3>
                <p style={{ color: '#d0d0d6', fontSize: '0.8rem' }}>يرجى الانتظار، السحابة تعمل الآن</p>
            </div>
        );
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
