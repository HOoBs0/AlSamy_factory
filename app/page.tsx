"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { Barcode, Camera, CameraOff, Minus, Plus, Search } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useReactToPrint } from "react-to-print"; // <-- 1. استدعاء مكتبة الطباعة

type Tab = "categories" | "quantities";

type Category = { barcode: string; name: string };
type StatementItem = { barcode: string; name: string; quantity: number };
type SavedRecord = StatementItem & { date: string; statementNumber: number };

type BarcodeScannerProps = {
  value: string;
  onChange: (value: string) => void;
  id: string;
  placeholder: string;
};

function BarcodeScanner({
  value,
  onChange,
  id,
  placeholder,
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState("");

  useEffect(
    () => () => {
      if (scannerRef.current?.isScanning)
        scannerRef.current.stop().catch(() => undefined);
    },
    [],
  );

  async function toggleScanner() {
    if (isScanning) {
      await scannerRef.current?.stop();
      setIsScanning(false);
      return;
    }

    setScannerError("");
    const scanner = scannerRef.current ?? new Html5Qrcode(`scanner-${id}`);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 120 } },
        (decodedText) => {
          onChange(decodedText);
          scanner.stop().catch(() => undefined);
          setIsScanning(false);
        },
        () => undefined,
      );
      setIsScanning(true);
    } catch {
      setScannerError(
        "تعذر تشغيل الكاميرا. اسمح بالوصول للكاميرا أو اكتب الباركود يدوياً.",
      );
      setIsScanning(false);
    }
  }

  return (
    <div className="barcode-field">
      <div className="input-with-icon scanner-input">
        <Barcode aria-hidden="true" />
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
        />
        <button
          type="button"
          className="scanner-button"
          onClick={toggleScanner}
          aria-label={isScanning ? "إيقاف ماسح الباركود" : "فتح ماسح الباركود"}
          title={isScanning ? "إيقاف الماسح" : "مسح بالكاميرا"}
        >
          {isScanning ? (
            <CameraOff aria-hidden="true" />
          ) : (
            <Camera aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        id={`scanner-${id}`}
        className={isScanning ? "scanner-preview visible" : "scanner-preview"}
        aria-live="polite"
      />
      {scannerError && (
        <p className="scanner-error" role="alert">
          {scannerError}
        </p>
      )}
    </div>
  );
}

type PrintCardProps = {
  name: string;
  barcode: string;
};

const PrintCard = React.forwardRef<HTMLDivElement, PrintCardProps>(
  ({ name, barcode }, ref) => {
    return (
      <div
        ref={ref}
        className="print-card-box"
        style={{ padding: "15px", textAlign: "center", fontFamily: "Arial" }}
      >
        <p style={{ fontSize: "14px", marginBottom: "5px" }}>
          الكود: <strong>{barcode}</strong>
        </p>
        <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>{name}</h3>
      </div>
    );
  },
);
PrintCard.displayName = "PrintCard";

const tabs: { id: Tab; label: string }[] = [
  { id: "categories", label: "الأصناف" },
  { id: "quantities", label: "تسجيل كميات" },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [barcode, setBarcode] = useState("");
  const [quantityBarcode, setQuantityBarcode] = useState("");
  const [quantitySearch, setQuantitySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // <-- 3. State لآخر صنف تم إضافته لطباعته تلقائياً -->
  const [latestPrintedItem, setLatestPrintedItem] = useState<{
    name: string;
    barcode: string;
    quantity: number;
  }>({
    name: "",
    barcode: "",
    quantity: 1,
  });

  const cardComponentRef = useRef<HTMLDivElement>(null);

  const handlePrintCard = useReactToPrint({
    contentRef: cardComponentRef,
    documentTitle: `Barcode-${latestPrintedItem.barcode}`,
    onBeforePrint: () => {
      document.body.classList.add("printing-barcode");
      return Promise.resolve();
    },
    onAfterPrint: () => {
      document.body.classList.remove("printing-barcode");
    },
  });

  useEffect(() => {
    try {
      const savedCategories = window.localStorage.getItem(
        "makhzani-categories",
      );
      const savedRecordsValue = window.localStorage.getItem("makhzani-records");
      if (savedCategories) setCategories(JSON.parse(savedCategories));
      if (savedRecordsValue) setSavedRecords(JSON.parse(savedRecordsValue));
    } catch {
      setCategories([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(
        "makhzani-categories",
        JSON.stringify(categories),
      );
      window.localStorage.setItem(
        "makhzani-records",
        JSON.stringify(savedRecords),
      );
    }
  }, [categories, savedRecords, isHydrated]);

  useEffect(() => {
    const matchedCategory = categories.find(
      (item) => item.barcode === quantityBarcode,
    );
    if (matchedCategory) {
      setSelectedCategory(matchedCategory);
      setQuantitySearch(matchedCategory.name);
    }
  }, [categories, quantityBarcode]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((item) =>
        `${item.barcode} ${item.name}`
          .toLocaleLowerCase("ar")
          .includes(search.toLocaleLowerCase("ar")),
      ),
    [categories, search],
  );

  const quantityMatches = useMemo(() => {
    const query = quantitySearch.trim().toLocaleLowerCase("ar");
    if (!query || selectedCategory) return [];
    return categories
      .filter((item) =>
        `${item.barcode} ${item.name}`.toLocaleLowerCase("ar").includes(query),
      )
      .slice(0, 6);
  }, [categories, quantitySearch, selectedCategory]);

  function selectCategory(category: Category) {
    setSelectedCategory(category);
    setQuantitySearch(category.name);
    setQuantityBarcode(category.barcode);
  }

  function addCategory() {
    const nextBarcode = barcode.trim();
    const nextName = name.trim();
    if (
      !nextBarcode ||
      !nextName ||
      categories.some((item) => item.barcode === nextBarcode)
    )
      return;
    setCategories((items) => [
      ...items,
      { barcode: nextBarcode, name: nextName },
    ]);
    setBarcode("");
    setName("");
  }

  function removeCategory(barcodeToRemove: string) {
    setCategories((items) =>
      items.filter((item) => item.barcode !== barcodeToRemove),
    );
  }

  // <-- 4. تحديث دالة addStatementItem لتقوم بالحفظ والطباعة الفورية معاً -->
  function addStatementItem() {
    if (!selectedCategory) return;

    const date = new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
    }).format(new Date());
    const currentCategory = selectedCategory;
    const currentQuantity = quantity;

    setSavedRecords((records) => {
      const otherDaysRecords = records.filter((record) => record.date !== date);
      const todayExistingRecords = records.filter(
        (record) => record.date === date,
      );

      let updatedTodayRecords = [...todayExistingRecords];
      const existingIndex = updatedTodayRecords.findIndex(
        (r) => r.barcode === currentCategory.barcode,
      );

      if (existingIndex > -1) {
        updatedTodayRecords[existingIndex] = {
          ...updatedTodayRecords[existingIndex],
          quantity:
            updatedTodayRecords[existingIndex].quantity + currentQuantity,
        };
      } else {
        updatedTodayRecords.push({
          ...currentCategory,
          quantity: currentQuantity,
          date,
          statementNumber: records.length + 1,
        });
      }

      return [...updatedTodayRecords, ...otherDaysRecords];
    });

    // تحديث بيانات الكارت المراد طباعته واستدعاء أمر الطباعة الفوري
    setLatestPrintedItem({
      name: currentCategory.name,
      barcode: currentCategory.barcode,
      quantity: currentQuantity,
    });

    setTimeout(() => {
      handlePrintCard();
    }, 250);

    setQuantity(1);
    setSelectedCategory(null);
    setQuantitySearch("");
    setQuantityBarcode("");
  }

  function deleteSavedRecord(barcodeToDelete: string, recordDate: string) {
    setSavedRecords((records) =>
      records.filter(
        (record) =>
          !(record.barcode === barcodeToDelete && record.date === recordDate),
      ),
    );
  }

  function handlePrint() {
    window.print();
  }

  const todayDate = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
  }).format(new Date());
  const todayRecords = savedRecords.filter(
    (record) => record.date === todayDate,
  );

  return (
    <main dir="rtl" className="app-shell">
      <header className="topbar">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <h1>مصنعي</h1>
        </div>
        <time dateTime={new Date().toISOString().split("T")[0]}>
          {new Date().toLocaleDateString("ar-EG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>{" "}
      </header>

      <nav className="tabs" aria-label="التنقل الرئيسي">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "categories" && (
        <section className="content-grid">
          <section className="panel add-panel">
            <h2>إضافة صنف</h2>
            <label htmlFor="category-barcode">الباركود</label>
            <BarcodeScanner
              id="category-barcode"
              value={barcode}
              onChange={setBarcode}
              placeholder="امسح الباركود أو اكتب الباركود"
            />
            <label htmlFor="category-name">اسم الصنف</label>
            <input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اسم الصنف"
            />
            <button className="primary-button" onClick={addCategory}>
              إضافة الصنف
            </button>
          </section>
          <section className="panel category-list">
            <div className="section-heading">
              <h2>الأصناف المسجلة</h2>
              <span className="count-badge">{categories.length} صنف</span>
            </div>
            <div className="search-box">
              <Search aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="إبحث بالاسم أو الباركود"
              />
            </div>
            {filteredCategories.length === 0 ? (
              <p className="empty-state">
                لا توجد أصناف بعد. أضف أول صنف من النموذج.
              </p>
            ) : (
              filteredCategories.map((item) => (
                <div className="table-row" key={item.barcode}>
                  <span className="barcode-value">{item.barcode}</span>
                  <span className="item-name">{item.name}</span>
                  <button
                    className="delete-button"
                    onClick={() => removeCategory(item.barcode)}
                    aria-label={`حذف ${item.name}`}
                  >
                    حذف
                  </button>
                </div>
              ))
            )}
          </section>
        </section>
      )}

      {activeTab === "quantities" && (
        <section className="content-grid">
          <section className="panel add-panel">
            <div className="section-heading">
              <div>
                <h2>بيان جديد</h2>
              </div>
            </div>
            <label htmlFor="quantity-search">الباركود</label>
            <BarcodeScanner
              id="quantity-search"
              value={quantityBarcode}
              onChange={setQuantityBarcode}
              placeholder="امسح الباركود أو اكتب الباركود"
            />
            <label htmlFor="item-search">أو ابحث عن الصنف بالاسم</label>
            <div className="category-search-wrap">
              <div className="input-with-icon">
                <Search aria-hidden="true" />
                <input
                  id="item-search"
                  value={quantitySearch}
                  onChange={(event) => {
                    setQuantitySearch(event.target.value);
                    setSelectedCategory(null);
                  }}
                  placeholder="اكتب اسم الصنف أو جزء من الباركود"
                  autoComplete="off"
                />
              </div>
              {quantityMatches.length > 0 && (
                <div
                  className="category-suggestions"
                  role="listbox"
                  aria-label="نتائج الأصناف"
                >
                  {quantityMatches.map((category) => (
                    <button
                      type="button"
                      key={category.barcode}
                      className="category-suggestion"
                      onClick={() => selectCategory(category)}
                    >
                      <span>
                        <small>{category.barcode}</small>

                        <strong>{category.name}</strong>
                      </span>
                      <span className="suggestion-arrow">اختيار</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCategory ? (
              <div className="selected-category">
                <div>
                  <span>الصنف المختار</span>
                  <strong>{selectedCategory.name}</strong>
                  <small>{selectedCategory.barcode}</small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setQuantitySearch("");
                    setQuantityBarcode("");
                  }}
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="selection-empty">
                لم يتم اختيار صنف بعد. ابدأ بالبحث بالاسم أو الباركود.
              </div>
            )}
            <label>الكمية</label>
            <div className="quantity-control">
              <button
                type="button"
                aria-label="تقليل الكمية"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus />
              </button>

              <input
                type="number"
                min="1"
                value={quantity}
                className="quantity-input"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) || val < 1 ? 1 : val);
                }}
                aria-label="الكمية"
              />

              <button
                type="button"
                aria-label="زيادة الكمية"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus />
              </button>
            </div>
            <button className="primary-button" onClick={addStatementItem}>
              اضافة
            </button>
          </section>
          <section className="category-list">
            <div className="record-summary">
              <h3>بنود البيان</h3>
              <span>عدد الأصناف: {todayRecords.length}</span>
              <span>
                إجمالي الكمية:{" "}
                {todayRecords.reduce((total, item) => total + item.quantity, 0)}
              </span>
            </div>
            {todayRecords.length === 0 ? (
              <p className="empty-state">لم تضف أي صنف بعد.</p>
            ) : (
              <div className="statement-table quantity-items-table">
                <div className="print-header-container">
                  <div className="print-title">بيان انتاج المصنع</div>
                  <div className="print-meta">
                    <span>التاريخ: {todayDate}</span>
                    <span>عدد الأصناف: {todayRecords.length}</span>
                    <span>
                      إجمالي الكمية:{" "}
                      {todayRecords.reduce(
                        (total, item) => total + item.quantity,
                        0,
                      )}
                    </span>
                  </div>
                </div>

                <div className="statement-row statement-header">
                  <span>الباركود</span>
                  <span>الصنف</span>
                  <span>الكمية</span>
                  <span>إجراء</span>
                </div>
                {todayRecords.map((item) => (
                  <div className="statement-row" key={item.barcode}>
                    <span>{item.barcode}</span>
                    <strong>{item.name}</strong>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => deleteSavedRecord(item.barcode, item.date)}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="action">
              <button className="primary-button" onClick={handlePrint}>
                طباعة البيان بالكامل
              </button>
            </div>
          </section>
        </section>
      )}

      {/* <-- 5. عنصر الكارت المخفي لتنفيذ أمر الطباعة الفورية للصنف المضاف حديثاً --> */}
      <div className="print-card-wrapper">
        <PrintCard
          ref={cardComponentRef}
          name={latestPrintedItem.name}
          barcode={latestPrintedItem.barcode}
        />
      </div>
    </main>
  );
}
