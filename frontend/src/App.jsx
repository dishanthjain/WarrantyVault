import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Wrench,
  X,
  Save,
} from 'lucide-react';

import './App.css';

const API = 'http://localhost:5001/api'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Products', icon: Package },
  { label: 'Warranties', icon: ShieldCheck },
  { label: 'Purchases', icon: CreditCard },
  { label: 'Repairs', icon: Wrench },
  { label: 'Scan documents', icon: ScanLine }
]

const emptyProduct = {
  PName: '',
  Brand: '',
  Model: '',
  SNumber: '',
  PurchaseDate: '',
  Price: '',
  T_No: '',
  SDate: '',
  EDate: '',
  Coverage: ''
}

const emptyRepair = {
  Product_ID: '',
  Date: new Date().toISOString().slice(0, 10),
  Issue: '',
  Cost: '',
  Service: '',
  Status: 'Requested'
}

const money = value =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value) || 0)

const date = value => {
  if (!value) return '—'
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
}


function App() {
  const [page, setPage] = useState('Overview')
  const [dashboard, setDashboard] = useState({
    products: 0,
    active: 0,
    expired: 0,
    expiring: 0,
    repairs: 0
  })
  const [products, setProducts] = useState([])
  const [warranties, setWarranties] = useState([])
  const [purchases, setPurchases] = useState([])
  const [repairs, setRepairs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [repairForm, setRepairForm] = useState(emptyRepair)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [scannedImage, setScannedImage] = useState('')
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [scanName, setScanName] = useState('warranty-document.jpg')
  const [scanProductId, setScanProductId] = useState('')
  const [scanFields, setScanFields] = useState({ PName: '', Brand: '', Model: '', SNumber: '', PurchaseDate: '', Price: '', T_No: '', SDate: '', EDate: '', Coverage: '' })
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const notificationMenuRef = useRef(null)

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed.')
    }

    return data
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const results = await Promise.all([
        request('/dashboard'),
        request('/products'),
        request('/warranties'),
        request('/purchases'),
        request('/repairs'),
        request('/notifications?limit=20').catch(() => null)
      ])

      setDashboard(results[0])
      setProducts(Array.isArray(results[1]) ? results[1] : [])
      setWarranties(Array.isArray(results[2]) ? results[2] : [])
      setPurchases(Array.isArray(results[3]) ? results[3] : [])
      setRepairs(Array.isArray(results[4]) ? results[4] : [])
      setNotifications(Array.isArray(results[5]?.notifications) ? results[5].notifications : [])
      setUnreadNotifications(Number(results[5]?.unreadCount) || 0)
    } catch (err) {
      setError(err.message || 'Unable to load WarrantyVault.')
    } finally {
      setLoading(false)
    }
  }, [request])

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await request('/notifications?limit=20')
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadNotifications(Number(data.unreadCount) || 0)
    } catch {
      setNotifications([])
      setUnreadNotifications(0)
    }
  }, [request])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!notificationOpen) return

    const closeOnOutsideClick = event => {
      if (!notificationMenuRef.current?.contains(event.target)) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [notificationOpen])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products

    return products.filter(item =>
      [
        item.PName,
        item.Brand,
        item.Model,
        item.SNumber
      ].some(value => String(value || '').toLowerCase().includes(term))
    )
  }, [products, search])

  const filteredWarranties = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return warranties

    return warranties.filter(item =>
      [
        item.PName,
        item.Brand,
        item.Model,
        item.SNumber,
        item.CurrentStatus
      ].some(value => String(value || '').toLowerCase().includes(term))
    )
  }, [warranties, search])

  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return purchases

    return purchases.filter(item =>
      [
        item.PName,
        item.Brand,
        item.Model,
        item.T_No
      ].some(value => String(value || '').toLowerCase().includes(term))
    )
  }, [purchases, search])

  const filteredRepairs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return repairs

    return repairs.filter(item =>
      [
        item.PName,
        item.Brand,
        item.Model,
        item.Issue,
        item.Service,
        item.Status
      ].some(value => String(value || '').toLowerCase().includes(term))
    )
  }, [repairs, search])

  const totalSpent = useMemo(
    () => purchases.reduce((sum, item) => sum + Number(item.Price || 0), 0),
    [purchases]
  )

  const recentPurchases = useMemo(
    () => [...purchases].sort((a, b) => String(b.Date).localeCompare(String(a.Date))).slice(0, 5),
    [purchases]
  )


  const expiringWarranties = useMemo(
    () => warranties
      .filter(item => item.CurrentStatus === 'Expiring Soon')
      .slice(0, 5),
    [warranties]
  )

  const navigate = label => {
    setPage(label)
    setSearch('')
    setMobileMenu(false)
    setNotificationOpen(false)
  }

  const openProductModal = () => {
    setProductForm(emptyProduct)
    setModal('product')
  }

  const openRepairModal = () => {
    setRepairForm({
      ...emptyRepair,
      Product_ID: products[0]?.Product_ID ? String(products[0].Product_ID) : ''
    })
    setModal('repair')
  }

  const addProduct = async event => {
    event.preventDefault()
    setSaving(true)

    try {
      await request('/products', {
        method: 'POST',
        body: JSON.stringify(productForm)
      })

      setModal('')
      setNotice('Product added successfully.')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not add product.')
    } finally {
      setSaving(false)
    }
  }

  const addRepair = async event => {
    event.preventDefault()
    setSaving(true)

    try {
      await request('/repairs', {
        method: 'POST',
        body: JSON.stringify(repairForm)
      })

      setModal('')
      setNotice('Repair record added successfully.')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not add repair.')
    } finally {
      setSaving(false)
    }
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
  }, [])

  const startCamera = async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access requires localhost or HTTPS and a supported browser.')
      return
    }
    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings and try again.' : 'Could not start the camera. Check that another app is not using it.')
    }
  }

  const captureDocument = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) {
      setCameraError('Wait for the camera preview to appear, then capture again.')
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const image = canvas.toDataURL('image/jpeg', 0.82)
    setScannedImage(image)
    setScanName(`warranty-scan-${new Date().toISOString().slice(0, 10)}.jpg`)
    setOcrText('')
    stopCamera()
    setOcrBusy(true)
    setCameraError('')
    try {
      const worker = await createWorker('eng')
      const result = await worker.recognize(image)
      await worker.terminate()
      const text = result.data.text || ''
      setOcrText(text)
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
      const dateMatches = [...text.matchAll(/\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g)].map(match => normalizeOCRDate(match[0])).filter(Boolean)
      const amountMatch = text.match(/(?:₹|INR|Rs\.?\s*)\s*([\d,]+(?:\.\d{1,2})?)/i) || text.match(/(?:total|amount|price)\s*[:-]?\s*([\d,]+(?:\.\d{1,2})?)/i)
      const serialLine = lines.find(line => /serial|s\/n|s\.n\.|serial no|imei/i.test(line)) || ''
      const serial = serialLine.match(/(?:serial(?:\s*(?:no|number))?|s\/n|s\.n\.|imei)\s*[:#-]?\s*([A-Z0-9-]{5,})/i)
      const brand = lines.find(line => /\b(apple|samsung|sony|lg|dell|hp|lenovo|asus|acer|boat|realme|xiaomi|redmi|oneplus|vivo|oppo|canon|nikon|whirlpool|bosch|philips)\b/i.test(line)) || ''
      setScanFields(current => ({
        ...current,
        PName: current.PName || lines.find(line => line.length > 3 && line.length < 65 && !/invoice|receipt|warranty|tax|date|amount|total|serial|address|phone|email/i.test(line)) || '',
        Brand: current.Brand || brand,
        SNumber: current.SNumber || (serial ? serial[1] : ''),
        PurchaseDate: current.PurchaseDate || dateMatches[0] || '',
        SDate: current.SDate || dateMatches[0] || '',
        EDate: current.EDate || dateMatches[1] || '',
        Price: current.Price || (amountMatch ? amountMatch[1].replace(/,/g, '') : ''),
        T_No: current.T_No || ((lines.find(line => /invoice|receipt|transaction|bill no/i.test(line)) || '').match(/[A-Z0-9-]{4,}/i)?.[0] || '')
      }))
      setNotice(text ? 'Scan complete. Review and correct the extracted fields.' : 'No text found. Try better lighting and scan again.')
    } catch (err) {
      setCameraError(`OCR could not read this scan: ${err.message || 'unknown error'}. You can still enter the fields manually.`)
    } finally {
      setOcrBusy(false)
    }
  }

  function normalizeOCRDate(raw) {
    const value = String(raw || '').replace(/[.-]/g, '/')
    let year, month, day
    const parts = value.split('/')
    if (parts[0].length === 4) [year, month, day] = parts
    else {
      day = parts[0]
      month = parts[1]
      year = parts[2]
      if (year && year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`
    }
    if (!year || !month || !day) return ''
    const result = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : ''
  }

  const updateScanField = (field, value) => setScanFields(current => ({ ...current, [field]: value }))

  const saveScannedDocument = async () => {
    if (!scannedImage) {
      setCameraError('Capture a document before saving it.')
      return
    }
    setSaving(true)
    try {
      await request('/documents', {
        method: 'POST',
        body: JSON.stringify({
          FileName: scanName,
          MimeType: 'image/jpeg',
          ImageData: scannedImage,
          Product_ID: scanProductId ? Number(scanProductId) : null,
          ExtractedText: ocrText
        })
      })
      setNotice('Scanned document saved to your vault.')
    } catch (err) {
      setNotice(err.message || 'Could not save scanned document.')
    } finally {
      setSaving(false)
    }
  }

  const registerScannedProduct = async event => {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await request('/products', { method: 'POST', body: JSON.stringify(scanFields) })
      if (scannedImage) {
        try {
          await request('/documents', {
            method: 'POST',
            body: JSON.stringify({ FileName: scanName, MimeType: 'image/jpeg', ImageData: scannedImage, Product_ID: created.Product_ID, ExtractedText: ocrText })
          })
        } catch (docError) {
          setNotice(`Product registered, but document saving failed: ${docError.message}`)
          await loadData()
          return
        }
      }
      setNotice('Product registered and scanned document saved.')
      setScanFields({ PName: '', Brand: '', Model: '', SNumber: '', PurchaseDate: '', Price: '', T_No: '', SDate: '', EDate: '', Coverage: '' })
      setScannedImage('')
      setOcrText('')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not register product. Check the required fields.')
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async item => {
    if (!window.confirm(`Delete ${item.PName}? Its related records will also be deleted.`)) return

    try {
      await request(`/products/${item.Product_ID}`, { method: 'DELETE' })
      setNotice('Product deleted.')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not delete product.')
    }
  }

  const deleteRepair = async item => {
    if (!window.confirm('Delete this repair record?')) return

    try {
      await request(`/repairs/${item.R_ID}`, { method: 'DELETE' })
      setNotice('Repair record deleted.')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not delete repair.')
    }
  }

  const updateRepairStatus = async (id, status) => {
    try {
      await request(`/repairs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ Status: status })
      })
      setNotice('Repair status updated.')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not update repair.')
    }
  }

  const updateWarrantyStatus = async (id, status) => {
    try {
      await request(`/warranties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ Status: status })
      })
      setNotice('Warranty status updated.')
      await loadData()
    } catch (err) {
      setNotice(err.message || 'Could not update warranty.')
    }
  }

  const markNotificationRead = async reminderId => {
    try {
      await request(`/notifications/${reminderId}/read`, { method: 'PATCH' })
      await refreshNotifications()
    } catch (err) {
      setNotice(err.message || 'Could not update the notification.')
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await request('/notifications/read-all', { method: 'PATCH' })
      await refreshNotifications()
    } catch (err) {
      setNotice(err.message || 'Could not update the notifications.')
    }
  }

  const openNotification = notification => {
    if (!notification.IsRead) void markNotificationRead(notification.Reminder_ID)
    navigate('Warranties')
  }

  const statusClass = status =>
    String(status || 'unknown').toLowerCase().replaceAll(' ', '-')

  const Status = ({ value }) => (
    <span className={`status status-${statusClass(value)}`}>
      <span className="status-dot" />
      {value || 'Unknown'}
    </span>
  )

  const PageHeading = ({ title, description, action, actionLabel }) => (
    <div className="page-heading">
      <div>
        <p className="eyebrow">WARRANTYVAULT / {title.toUpperCase()}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && (
        <button className="button button-primary" onClick={action}>
          <Plus size={17} />
          {actionLabel}
        </button>
      )}
    </div>
  )

  const EmptyState = ({ message }) => (
    <div className="empty-state">
      <Package size={32} strokeWidth={1.5} />
      <strong>Nothing here yet</strong>
      <span>{message}</span>
    </div>
  )

  const SearchBar = ({ placeholder = 'Search...' }) => (
    <label className="search-box">
      <Search size={17} />
      <input
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder={placeholder}
      />
      {search && (
        <button className="icon-button" onClick={() => setSearch('')} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
    </label>
  )

  const renderNotificationBell = () => (
    <div className="notification-menu" ref={notificationMenuRef}>
      <button
        className={`icon-button notification-trigger ${unreadNotifications ? 'has-unread' : ''}`}
        onClick={() => setNotificationOpen(current => !current)}
        aria-label={`${unreadNotifications} unread warranty notifications`}
        aria-expanded={notificationOpen}
      >
        <Bell size={17} />
        {unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
      </button>

      {notificationOpen && (
        <section className="notification-popover" aria-label="Warranty notifications">
          <div className="notification-heading">
            <div>
              <strong>Warranty reminders</strong>
              <span>{unreadNotifications ? `${unreadNotifications} unread` : 'You are all caught up'}</span>
            </div>
            {unreadNotifications > 0 && (
              <button className="text-button" onClick={() => void markAllNotificationsRead()}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length ? notifications.map(notification => {
              const daysRemaining = Number(notification.DaysRemaining)
              const timing = daysRemaining < 0
                ? 'Expired'
                : daysRemaining === 0
                  ? 'Expires today'
                  : `${daysRemaining} days left`

              return (
                <div className={`notification-row ${notification.IsRead ? '' : 'notification-unread'}`} key={notification.Reminder_ID}>
                  <button className="notification-item" onClick={() => openNotification(notification)}>
                    <span className="notification-icon">
                      {daysRemaining <= 0 ? <AlertTriangle size={16} /> : <Clock3 size={16} />}
                    </span>
                    <span className="notification-copy">
                      <strong>{notification.PName}</strong>
                      <span>{notification.Title}</span>
                      <small>Expires {date(notification.ExpiryDate)} · {timing}</small>
                    </span>
                  </button>
                  {!notification.IsRead && (
                    <button
                      className="notification-read"
                      onClick={() => void markNotificationRead(notification.Reminder_ID)}
                      aria-label={`Mark ${notification.PName} notification as read`}
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              )
            }) : (
              <div className="notification-empty">
                <Bell size={19} />
                <span>No warranty reminders yet.</span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )

  const StatCard = ({ icon: Icon, label, value, note, tone, onClick }) => (
    <button
      className={`stat-card ${onClick ? 'stat-clickable' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="stat-top">
        <span className={`stat-icon ${tone}`}><Icon size={20} /></span>
        <span className="stat-note"><ArrowUpRight size={14} /> {note}</span>
      </div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </button>
  )

  const renderOverview = () => (
    <>
      <PageHeading
        title="Overview"
        description="Here's what's happening with your products and warranties."
        action={openProductModal}
        actionLabel="Add product"
      />

      {error && (
        <div className="error-banner">
          <AlertTriangle size={19} />
          <div>
            <strong>Couldn't load your data</strong>
            <p>{error}</p>
            <button className="text-button" onClick={loadData}>Try again</button>
          </div>
        </div>
      )}

      <div className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-tag"><ShieldCheck size={14} /> YOUR PERSONAL INVENTORY</span>
          <h2>Everything protected.<br /><span>Nothing forgotten.</span></h2>
          <p>Keep every purchase, warranty and repair in one place.</p>
          <button className="button button-light" onClick={openProductModal}>
            Register a product <ChevronRight size={17} />
          </button>
        </div>
        <div className="welcome-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="shield-art"><ShieldCheck size={76} strokeWidth={1.2} /></div>
          <div className="floating-chip chip-one"><Check size={14} /> Protected</div>
          <div className="floating-chip chip-two"><Clock3 size={14} /> Always tracked</div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={Package}
          label="Total products"
          value={dashboard.products}
          note="Inventory"
          tone="purple"
          onClick={() => navigate('Products')}
        />
        <StatCard
          icon={ShieldCheck}
          label="Active warranties"
          value={dashboard.active}
          note="Protected"
          tone="green"
          onClick={() => navigate('Warranties')}
        />
        <StatCard
          icon={Clock3}
          label="Expiring soon"
          value={dashboard.expiring}
          note="Next 30 days"
          tone="orange"
          onClick={() => navigate('Warranties')}
        />
        <StatCard
          icon={Wrench}
          label="Repair records"
          value={dashboard.repairs}
          note="All records"
          tone="blue"
          onClick={() => navigate('Repairs')}
        />
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Warranty watchlist</h3>
              <p>Products that need your attention</p>
            </div>
            <button className="text-button" onClick={() => navigate('Warranties')}>
              View all <ChevronRight size={15} />
            </button>
          </div>
          {expiringWarranties.length ? (
            <div className="watchlist">
              {expiringWarranties.map(item => (
                <div className="watch-item" key={item.W_ID}>
                  <div className="product-avatar"><Package size={19} /></div>
                  <div className="watch-info">
                    <strong>{item.PName}</strong>
                    <span>{item.Brand} {item.Model || ''}</span>
                  </div>
                  <div className="watch-date">
                    <strong>{item.DaysRemaining} days</strong>
                    <span>left</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Warranties expiring in the next 30 days will appear here." />
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Quick actions</h3>
              <p>Manage your records</p>
            </div>
            <Activity size={19} className="muted-icon" />
          </div>
          <div className="quick-actions">
            <button onClick={openProductModal} className="quick-action">
              <span className="quick-icon purple"><Plus size={19} /></span>
              <span><strong>Add a product</strong><small>Register a purchase and warranty</small></span>
              <ChevronRight size={17} />
            </button>
            <button onClick={openRepairModal} className="quick-action">
              <span className="quick-icon blue"><Wrench size={19} /></span>
              <span><strong>Log a repair</strong><small>Record a service or repair</small></span>
              <ChevronRight size={17} />
            </button>
            <button onClick={() => navigate('Purchases')} className="quick-action">
              <span className="quick-icon orange"><FileText size={19} /></span>
              <span><strong>View purchases</strong><small>Review your spending history</small></span>
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="spending-summary">
            <div className="spending-icon"><TrendingUp size={19} /></div>
            <div><span>Total purchase value</span><strong>{money(totalSpent)}</strong></div>
            <span className="spending-count">{purchases.length} purchases</span>
          </div>
        </section>
      </div>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent purchases</h3>
            <p>Your latest registered purchases</p>
          </div>
          <button className="text-button" onClick={() => navigate('Purchases')}>
            All purchases <ChevronRight size={15} />
          </button>
        </div>
        {recentPurchases.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Purchase date</th><th>Receipt / transaction</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {recentPurchases.map(item => (
                  <tr key={item.P_ID}>
                    <td><div className="table-product"><span className="product-avatar"><Package size={17} /></span><span><strong>{item.PName}</strong><small>{item.Brand}</small></span></div></td>
                    <td>{date(item.Date)}</td>
                    <td>{item.T_No || '—'}</td>
                    <td className="amount-cell">{money(item.Price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="Your purchase history will appear here after you add a product." />}
      </section>
    </>
  )

  const renderProducts = () => (
    <>
      <PageHeading title="Products" description="Manage your registered devices and appliances." action={openProductModal} actionLabel="Add product" />
      <div className="toolbar">
        <SearchBar placeholder="Search products, brands, serial numbers..." />
        <span className="result-count">{filteredProducts.length} products</span>
      </div>
      <section className="panel data-panel">
        {filteredProducts.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Serial number</th><th>Purchase date</th><th>Warranty</th><th>Price</th><th /></tr></thead>
              <tbody>
                {filteredProducts.map(item => (
                  <tr key={item.Product_ID}>
                    <td><div className="table-product"><span className="product-avatar"><Package size={18} /></span><span><strong>{item.PName}</strong><small>{item.Brand} {item.Model || ''}</small></span></div></td>
                    <td className="mono">{item.SNumber}</td>
                    <td>{date(item.PurchaseDate)}</td>
                    <td><Status value={item.WarrantyStatus} /></td>
                    <td className="amount-cell">{money(item.Price)}</td>
                    <td><button className="icon-button danger-hover" onClick={() => deleteProduct(item)} aria-label={`Delete ${item.PName}`}><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message={search ? 'Try a different search.' : 'Add your first product to start tracking warranties.'} />}
      </section>
    </>
  )

  const renderWarranties = () => (
    <>
      <PageHeading title="Warranties" description="Track coverage, expiry dates and warranty status." />
      <div className="stats-grid compact-stats">
        <StatCard icon={ShieldCheck} label="Active" value={dashboard.active} note="Protected" tone="green" />
        <StatCard icon={Clock3} label="Expiring soon" value={dashboard.expiring} note="30 days" tone="orange" />
        <StatCard icon={AlertTriangle} label="Expired" value={dashboard.expired} note="Needs attention" tone="red" />
      </div>
      <div className="toolbar">
        <SearchBar placeholder="Search warranties..." />
        <span className="result-count">{filteredWarranties.length} warranties</span>
      </div>
      <section className="panel data-panel">
        {filteredWarranties.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Coverage</th><th>Start date</th><th>Expiry date</th><th>Remaining</th><th>Status</th><th>Update</th></tr></thead>
              <tbody>
                {filteredWarranties.map(item => (
                  <tr key={item.W_ID}>
                    <td><div className="table-product"><span className="product-avatar"><ShieldCheck size={18} /></span><span><strong>{item.PName}</strong><small>{item.Brand} {item.Model || ''}</small></span></div></td>
                    <td className="coverage-cell">{item.Coverage || 'Standard coverage'}</td>
                    <td>{date(item.SDate)}</td>
                    <td>{date(item.EDate)}</td>
                    <td>{Number(item.DaysRemaining) >= 0 ? `${item.DaysRemaining} days` : 'Expired'}</td>
                    <td><Status value={item.CurrentStatus} /></td>
                    <td>
                      <select
                        className="inline-select"
                        value={['Active', 'Expired', 'Claimed', 'Voided'].includes(item.StoredStatus) ? item.StoredStatus : 'Active'}
                        onChange={event => updateWarrantyStatus(item.W_ID, event.target.value)}
                        aria-label={`Update ${item.PName} warranty`}
                      >
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Claimed">Claimed</option>
                        <option value="Voided">Voided</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="Warranty details will appear here when you register products." />}
      </section>
    </>
  )

  const renderPurchases = () => (
    <>
      <PageHeading title="Purchases" description="Your purchase history and total spending." />
      <div className="purchase-summary">
        <div className="purchase-summary-icon"><CreditCard size={22} /></div>
        <div><span>Total spent</span><strong>{money(totalSpent)}</strong></div>
        <div><span>Total purchases</span><strong>{purchases.length}</strong></div>
        <div><span>Average purchase</span><strong>{money(purchases.length ? totalSpent / purchases.length : 0)}</strong></div>
      </div>
      <div className="toolbar">
        <SearchBar placeholder="Search purchases..." />
        <span className="result-count">{filteredPurchases.length} records</span>
      </div>
      <section className="panel data-panel">
        {filteredPurchases.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Purchase date</th><th>Transaction number</th><th>Amount</th></tr></thead>
              <tbody>
                {filteredPurchases.map(item => (
                  <tr key={item.P_ID}>
                    <td><div className="table-product"><span className="product-avatar"><Package size={18} /></span><span><strong>{item.PName}</strong><small>{item.Brand} {item.Model || ''}</small></span></div></td>
                    <td>{date(item.Date)}</td>
                    <td className="mono">{item.T_No || '—'}</td>
                    <td className="amount-cell">{money(item.Price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="Purchases will appear here when you register a product." />}
      </section>
    </>
  )

  const renderRepairs = () => (
    <>
      <PageHeading title="Repairs" description="Keep a record of service visits, issues and repair costs." action={openRepairModal} actionLabel="Log repair" />
      <div className="stats-grid compact-stats">
        <StatCard icon={Wrench} label="Total repairs" value={repairs.length} note="All records" tone="blue" />
        <StatCard icon={Clock3} label="In progress" value={repairs.filter(item => item.Status === 'In Progress').length} note="Ongoing" tone="orange" />
        <StatCard icon={Check} label="Completed" value={repairs.filter(item => item.Status === 'Completed').length} note="Finished" tone="green" />
      </div>
      <div className="toolbar">
        <SearchBar placeholder="Search repairs or issues..." />
        <span className="result-count">{filteredRepairs.length} records</span>
      </div>
      <section className="panel data-panel">
        {filteredRepairs.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Issue</th><th>Repair date</th><th>Service centre</th><th>Cost</th><th>Status</th><th /></tr></thead>
              <tbody>
                {filteredRepairs.map(item => (
                  <tr key={item.R_ID}>
                    <td><div className="table-product"><span className="product-avatar"><Wrench size={18} /></span><span><strong>{item.PName}</strong><small>{item.Brand}</small></span></div></td>
                    <td className="issue-cell">{item.Issue}</td>
                    <td>{date(item.Date)}</td>
                    <td>{item.Service || '—'}</td>
                    <td className="amount-cell">{money(item.Cost)}</td>
                    <td>
                      <select className="inline-select" value={item.Status} onChange={event => updateRepairStatus(item.R_ID, event.target.value)} aria-label={`Update repair status for ${item.PName}`}>
                        <option value="Requested">Requested</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td><button className="icon-button danger-hover" onClick={() => deleteRepair(item)} aria-label="Delete repair"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="Repair records will appear here when you log a repair." />}
      </section>
    </>
  )

  const renderScanner = () => (
    <>
      <PageHeading title="Scan documents" description="Capture a receipt or warranty card, extract its text with OCR, then review the details before saving." />
      <div className="scan-layout">
        <section className="panel scan-camera-panel">
          <div className="panel-heading"><div><h3><Camera size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />Document camera</h3><p>Hold the document flat in bright, even light.</p></div><span className="status status-active">On-device OCR</span></div>
          <div className="scan-preview">
            {!scannedImage ? <video ref={videoRef} autoPlay playsInline muted className="scan-video" /> : <img src={scannedImage} alt="Captured document" className="scan-photo" />}
            {!cameraOn && !scannedImage && <div className="scan-placeholder"><Camera size={38} /><strong>Camera preview</strong><span>Start your camera to scan a document.</span></div>}
          </div>
          <canvas ref={canvasRef} hidden />
          {cameraError && <div className="scan-error">{cameraError}</div>}
          <div className="scan-controls">
            {!cameraOn ? <button className="button button-primary" onClick={startCamera}><Camera size={17} /> Start camera</button> : <button className="button button-primary" onClick={captureDocument}><ScanLine size={17} /> Capture & read text</button>}
            {cameraOn && <button className="button button-secondary" onClick={stopCamera}>Stop camera</button>}
            {scannedImage && <button className="button button-secondary" onClick={() => { setScannedImage(''); setOcrText(''); setCameraError(''); }}><RotateCcw size={16} /> Retake</button>}
          </div>
          {ocrBusy && <div className="ocr-progress"><LoaderCircle className="spin" size={18} /> Reading document text locally… first scan may take a little longer.</div>}
          <p className="scan-privacy">Your camera image is processed in your browser for OCR. It is sent to your local WarrantyVault backend only when you choose to save it.</p>
        </section>
        <section className="panel scan-fields-panel">
          <div className="panel-heading"><div><h3><FileText size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />Review extracted details</h3><p>OCR can make mistakes. Check every field before saving.</p></div></div>
          <form className="scan-form" onSubmit={registerScannedProduct}>
            <div className="form-section-title">PRODUCT DETAILS</div>
            <div className="form-grid">
              <label>Product name *<input required value={scanFields.PName} onChange={e => updateScanField('PName', e.target.value)} placeholder="e.g. Galaxy S25" /></label>
              <label>Brand *<input required value={scanFields.Brand} onChange={e => updateScanField('Brand', e.target.value)} placeholder="e.g. Samsung" /></label>
              <label>Model<input value={scanFields.Model} onChange={e => updateScanField('Model', e.target.value)} /></label>
              <label>Serial number *<input required value={scanFields.SNumber} onChange={e => updateScanField('SNumber', e.target.value)} /></label>
            </div>
            <div className="form-section-title">PURCHASE DETAILS</div>
            <div className="form-grid">
              <label>Purchase date *<input type="date" required value={scanFields.PurchaseDate} onChange={e => updateScanField('PurchaseDate', e.target.value)} /></label>
              <label>Price (₹)<input type="number" min="0" step="0.01" value={scanFields.Price} onChange={e => updateScanField('Price', e.target.value)} /></label>
              <label className="full-field">Receipt / transaction number<input value={scanFields.T_No} onChange={e => updateScanField('T_No', e.target.value)} /></label>
            </div>
            <div className="form-section-title">WARRANTY DETAILS</div>
            <div className="form-grid">
              <label>Warranty start *<input type="date" required value={scanFields.SDate} onChange={e => updateScanField('SDate', e.target.value)} /></label>
              <label>Warranty expiry *<input type="date" min={scanFields.SDate || undefined} required value={scanFields.EDate} onChange={e => updateScanField('EDate', e.target.value)} /></label>
              <label className="full-field">Coverage details<textarea rows="2" value={scanFields.Coverage} onChange={e => updateScanField('Coverage', e.target.value)} placeholder="Edit or enter coverage details" /></label>
            </div>
            <div className="form-section-title">SAVE ORIGINAL SCAN</div>
            <div className="form-grid">
              <label className="full-field">Document filename<input value={scanName} onChange={e => setScanName(e.target.value)} /></label>
              <label className="full-field">Link to existing product (optional)
                <select value={scanProductId} onChange={e => setScanProductId(e.target.value)}><option value="">Save without linking</option>{products.map(item => <option key={item.Product_ID} value={item.Product_ID}>{item.PName} — {item.Brand}</option>)}</select>
              </label>
            </div>
            {ocrText && <details className="ocr-text"><summary>View raw OCR text</summary><pre>{ocrText}</pre></details>}
            <div className="modal-actions scan-actions">
              <button type="button" className="button button-secondary" disabled={!scannedImage || saving} onClick={saveScannedDocument}><Save size={16} /> Save document only</button>
              <button type="submit" className="button button-primary" disabled={saving || ocrBusy}>{saving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />} Register product & save scan</button>
            </div>
            <p className="form-hint">Fields marked * are required to register a product. You can save just the scan without registering a product.</p>
          </form>
        </section>
      </div>
    </>
  )

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={24} /></div>
          <div><strong>Warranty<span>Vault</span></strong><small>YOUR ASSET COMPANION</small></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19} /></button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {navigation.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                className={`nav-item ${page === item.label ? 'nav-active' : ''}`}
                onClick={() => navigate(item.label)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.label === 'Warranties' && dashboard.expiring > 0 && <span className="nav-count">{dashboard.expiring}</span>}
                {page === item.label && <span className="nav-indicator" />}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Bell size={18} /></div>
            <strong>Stay protected</strong>
            <p>Check upcoming warranty expirations before it's too late.</p>
            <button onClick={() => navigate('Warranties')}>Review warranties <ChevronRight size={14} /></button>
          </div>
          <div className="sidebar-footer">
            <div className="avatar">D</div>
            <div><strong>Demo User</strong><span>Personal workspace</span></div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="breadcrumb">Workspace <ChevronRight size={14} /> <strong>{page}</strong></div>
          </div>
          <div className="topbar-right">
            <div className="date-chip"><CalendarDays size={15} /> {currentDate}</div>
            {renderNotificationBell()}
            <button className="icon-button refresh-button" onClick={loadData} aria-label="Refresh data"><RefreshCw size={17} /></button>
            <div className="top-avatar">D</div>
          </div>
        </header>

        <div className="content-area">
          {loading && !products.length && !error ? (
            <div className="loading-screen"><LoaderCircle size={28} className="spin" /><span>Loading your workspace...</span></div>
          ) : (
            <>
              {page === 'Overview' && renderOverview()}
              {page === 'Products' && renderProducts()}
              {page === 'Warranties' && renderWarranties()}
              {page === 'Purchases' && renderPurchases()}
              {page === 'Repairs' && renderRepairs()}
              {page === 'Scan documents' && renderScanner()}
            </>
          )}
          <footer className="app-footer">
            <span>© {new Date().getFullYear()} WarrantyVault</span>
            <span>Built to keep your assets protected <ShieldCheck size={14} /></span>
          </footer>
        </div>
      </main>

      {notice && <div className="toast"><Check size={17} /> {notice}</div>}

      {modal && (
        <div className="modal-backdrop" onClick={event => {
          if (event.target === event.currentTarget && !saving) setModal('')
        }}>
          <section className="modal">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">WARRANTYVAULT / NEW RECORD</p>
                <h2>{modal === 'product' ? 'Register product' : 'Log a repair'}</h2>
                <p>{modal === 'product' ? 'Add your product, purchase and warranty details.' : 'Record a service or repair for a registered product.'}</p>
              </div>
              <button className="icon-button" onClick={() => setModal('')} disabled={saving} aria-label="Close modal"><X size={20} /></button>
            </div>

            {modal === 'product' ? (
              <form onSubmit={addProduct}>
                <div className="form-section-title">PRODUCT DETAILS</div>
                <div className="form-grid">
                  <label>Product name *<input required value={productForm.PName} onChange={event => setProductForm({ ...productForm, PName: event.target.value })} placeholder="e.g. Galaxy S25" /></label>
                  <label>Brand *<input required value={productForm.Brand} onChange={event => setProductForm({ ...productForm, Brand: event.target.value })} placeholder="e.g. Samsung" /></label>
                  <label>Model<input value={productForm.Model} onChange={event => setProductForm({ ...productForm, Model: event.target.value })} placeholder="Model number" /></label>
                  <label>Serial number *<input required value={productForm.SNumber} onChange={event => setProductForm({ ...productForm, SNumber: event.target.value })} placeholder="Unique serial number" /></label>
                </div>

                <div className="form-section-title">PURCHASE DETAILS</div>
                <div className="form-grid">
                  <label>Purchase date *<input type="date" required value={productForm.PurchaseDate} onChange={event => setProductForm({ ...productForm, PurchaseDate: event.target.value })} /></label>
                  <label>Price (₹)<input type="number" min="0" step="0.01" value={productForm.Price} onChange={event => setProductForm({ ...productForm, Price: event.target.value })} placeholder="0.00" /></label>
                  <label className="full-field">Transaction / receipt number<input value={productForm.T_No} onChange={event => setProductForm({ ...productForm, T_No: event.target.value })} placeholder="Optional receipt number" /></label>
                </div>

                <div className="form-section-title">WARRANTY DETAILS</div>
                <div className="form-grid">
                  <label>Warranty start *<input type="date" required value={productForm.SDate} onChange={event => setProductForm({ ...productForm, SDate: event.target.value })} /></label>
                  <label>Warranty expiry *<input type="date" min={productForm.SDate || undefined} required value={productForm.EDate} onChange={event => setProductForm({ ...productForm, EDate: event.target.value })} /></label>
                  <label className="full-field">Coverage details<textarea rows="2" value={productForm.Coverage} onChange={event => setProductForm({ ...productForm, Coverage: event.target.value })} placeholder="What does the warranty cover?" /></label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setModal('')} disabled={saving}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Register product</button>
                </div>
              </form>
            ) : (
              <form onSubmit={addRepair}>
                <div className="form-section-title">REPAIR DETAILS</div>
                <div className="form-grid">
                  <label className="full-field">Product *
                    <select required value={repairForm.Product_ID} onChange={event => setRepairForm({ ...repairForm, Product_ID: event.target.value })}>
                      <option value="">Select a product</option>
                      {products.map(item => <option key={item.Product_ID} value={item.Product_ID}>{item.PName} — {item.Brand}</option>)}
                    </select>
                  </label>
                  <label>Repair date *<input type="date" required value={repairForm.Date} onChange={event => setRepairForm({ ...repairForm, Date: event.target.value })} /></label>
                  <label>Repair cost (₹)<input type="number" min="0" step="0.01" value={repairForm.Cost} onChange={event => setRepairForm({ ...repairForm, Cost: event.target.value })} placeholder="0.00" /></label>
                  <label className="full-field">Issue description *<textarea required rows="3" value={repairForm.Issue} onChange={event => setRepairForm({ ...repairForm, Issue: event.target.value })} placeholder="Describe the problem" /></label>
                  <label>Service centre<input value={repairForm.Service} onChange={event => setRepairForm({ ...repairForm, Service: event.target.value })} placeholder="Service provider" /></label>
                  <label>Status
                    <select value={repairForm.Status} onChange={event => setRepairForm({ ...repairForm, Status: event.target.value })}>
                      <option value="Requested">Requested</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={() => setModal('')} disabled={saving}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={saving || !products.length}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Save repair</button>
                </div>
                {!products.length && <p className="form-hint">Register a product before adding a repair.</p>}
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
