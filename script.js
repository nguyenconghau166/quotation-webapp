/**
 * HAUS SIGNS - Quotation Generator
 * Main JavaScript
 */

// ==================== State ====================
const state = {
  items: [
    { description: '', quantity: 0, price: 0 }
  ],
  images: [],
  dp: 0
};

// ==================== DOM Elements ====================
const elements = {
  customerName: document.getElementById('customerName'),
  address: document.getElementById('address'),
  phone: document.getElementById('phone'),
  quoteDate: document.getElementById('quoteDate'),
  itemsBody: document.getElementById('itemsBody'),
  addItemBtn: document.getElementById('addItemBtn'),
  dpAmount: document.getElementById('dpAmount'),
  subtotalDisplay: document.getElementById('subtotalDisplay'),
  totalDisplay: document.getElementById('totalDisplay'),
  imageUploadArea: document.getElementById('imageUploadArea'),
  imageInput: document.getElementById('imageInput'),
  imagePreviews: document.getElementById('imagePreviews'),
  previewBtn: document.getElementById('previewBtn'),
  exportBtn: document.getElementById('exportBtn'),
  previewSection: document.getElementById('previewSection'),
  closePreview: document.getElementById('closePreview'),
  previewContainer: document.getElementById('previewContainer')
};

// ==================== Initialize ====================
function init() {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  elements.quoteDate.value = today;

  // Render initial items
  renderItems();

  // Event listeners
  elements.addItemBtn.addEventListener('click', addItem);
  elements.dpAmount.addEventListener('input', updateTotals);

  // Image upload
  elements.imageUploadArea.addEventListener('click', () => elements.imageInput.click());
  elements.imageInput.addEventListener('change', handleImageSelect);

  // Drag and drop
  elements.imageUploadArea.addEventListener('dragover', handleDragOver);
  elements.imageUploadArea.addEventListener('dragleave', handleDragLeave);
  elements.imageUploadArea.addEventListener('drop', handleDrop);

  // Paste from clipboard (Ctrl+V) - works anywhere on page
  document.addEventListener('paste', handleGlobalPaste);

  // Preview and export
  elements.previewBtn.addEventListener('click', showPreview);
  elements.closePreview.addEventListener('click', hidePreview);
  elements.exportBtn.addEventListener('click', exportPDF);
}

// ==================== Items Management ====================
function renderItems() {
  elements.itemsBody.innerHTML = '';

  state.items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" placeholder="Enter description" 
               value="${item.description}" 
               data-index="${index}" data-field="description">
      </td>
      <td>
        <input type="number" placeholder="0" min="0"
               value="${item.quantity || ''}" 
               data-index="${index}" data-field="quantity">
      </td>
      <td>
        <input type="number" placeholder="0.00" min="0" step="0.01"
               value="${item.price || ''}" 
               data-index="${index}" data-field="price">
      </td>
      <td>
        <div class="amount-display">${formatNumber(item.quantity * item.price)}</div>
      </td>
      <td>
        <button class="remove-item-btn" data-index="${index}" ${state.items.length === 1 ? 'disabled' : ''}>✕</button>
      </td>
    `;
    elements.itemsBody.appendChild(tr);
  });

  // Add event listeners to inputs
  elements.itemsBody.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', handleItemInput);
  });

  // Add event listeners to remove buttons
  elements.itemsBody.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', removeItem);
  });

  updateTotals();
}

function handleItemInput(e) {
  const index = parseInt(e.target.dataset.index);
  const field = e.target.dataset.field;
  let value = e.target.value;

  if (field === 'quantity' || field === 'price') {
    value = parseFloat(value) || 0;
  }

  state.items[index][field] = value;

  // Update amount display
  const tr = e.target.closest('tr');
  const amount = state.items[index].quantity * state.items[index].price;
  tr.querySelector('.amount-display').textContent = formatNumber(amount);

  updateTotals();
}

function addItem() {
  if (state.items.length < 10) {
    state.items.push({ description: '', quantity: 0, price: 0 });
    renderItems();
  }
}

function removeItem(e) {
  const index = parseInt(e.target.dataset.index);
  if (state.items.length > 1) {
    state.items.splice(index, 1);
    renderItems();
  }
}

function updateTotals() {
  const subtotal = state.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  state.dp = parseFloat(elements.dpAmount.value) || 0;
  const total = subtotal - state.dp;

  elements.subtotalDisplay.textContent = formatNumber(subtotal);
  elements.totalDisplay.textContent = formatNumber(total);
}

// ==================== Image Upload ====================
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  addImages(files);
}

function handleDragOver(e) {
  e.preventDefault();
  elements.imageUploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  elements.imageUploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  elements.imageUploadArea.classList.remove('dragover');

  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  addImages(files);
}

function handleGlobalPaste(e) {
  // Only handle if upload area is visible (not at max images)
  if (state.images.length >= 3) return;

  // Don't handle if user is typing in an input/textarea
  const activeElement = document.activeElement;
  if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
    return;
  }

  const items = e.clipboardData?.items;
  if (!items) return;

  const imageFiles = [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }

  if (imageFiles.length > 0) {
    e.preventDefault();
    // Visual feedback - briefly highlight the upload area
    elements.imageUploadArea.classList.add('dragover');
    setTimeout(() => {
      elements.imageUploadArea.classList.remove('dragover');
    }, 300);
    addImages(imageFiles);
  }
}

function addImages(files) {
  const remaining = 3 - state.images.length;
  const toAdd = files.slice(0, remaining);

  toAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.images.push({
        name: file.name,
        data: e.target.result
      });
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const labels = ['Layout', 'Additional 1', 'Additional 2'];

  elements.imagePreviews.innerHTML = state.images.map((img, index) => `
    <div class="image-preview-item">
      <img src="${img.data}" alt="${img.name}">
      <button class="remove-btn" data-index="${index}">✕</button>
      <div class="image-label">${labels[index] || 'Image ' + (index + 1)}</div>
    </div>
  `).join('');

  // Add remove listeners
  elements.imagePreviews.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      state.images.splice(index, 1);
      renderImagePreviews();
    });
  });

  // Update upload area visibility
  if (state.images.length >= 3) {
    elements.imageUploadArea.style.display = 'none';
  } else {
    elements.imageUploadArea.style.display = 'block';
  }
}

// ==================== Preview ====================
function showPreview() {
  updatePDFTemplate();

  // Clone template for preview
  const template = document.getElementById('pdfTemplate');
  elements.previewContainer.innerHTML = template.innerHTML;

  elements.previewSection.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hidePreview() {
  elements.previewSection.classList.remove('active');
  document.body.style.overflow = '';
}

// ==================== PDF Generation ====================
function updatePDFTemplate() {
  // Customer info
  document.getElementById('pdfCustomerName').textContent = elements.customerName.value || '';
  document.getElementById('pdfAddress').textContent = elements.address.value || '';
  document.getElementById('pdfPhone').textContent = elements.phone.value || '';

  // Date
  const date = elements.quoteDate.value;
  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }) : '';
  document.getElementById('pdfDate').textContent = formattedDate;

  // Items
  const itemsBody = document.getElementById('pdfItemsBody');
  itemsBody.innerHTML = '';

  let subtotal = 0;
  state.items.forEach(item => {
    if (item.description || item.quantity > 0 || item.price > 0) {
      const amount = item.quantity * item.price;
      subtotal += amount;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.description}</td>
        <td>${item.quantity || ''}</td>
        <td>${item.price ? formatNumber(item.price) : ''}</td>
        <td>${formatNumber(amount)}</td>
      `;
      itemsBody.appendChild(tr);
    }
  });

  // Totals
  const dp = parseFloat(elements.dpAmount.value) || 0;
  const total = subtotal - dp;

  document.getElementById('pdfDP').textContent = formatNumber(dp);
  document.getElementById('pdfSubtotal').textContent = formatNumber(subtotal);
  document.getElementById('pdfTotal').textContent = formatNumber(total);

  // Images - each in its own row
  const layoutContainer = document.getElementById('pdfLayoutImage');
  const imagesSection = document.getElementById('pdfImagesSection');

  if (layoutContainer) {
    if (state.images.length > 0) {
      // Show each image in its own row with label
      layoutContainer.innerHTML = state.images.map((img, i) =>
        `<div class="pdf-image-row">
          <img src="${img.data}" alt="Layout ${i + 1}">
          <div class="pdf-image-label">Layout ${i + 1} of ${state.images.length}</div>
        </div>`
      ).join('');
      imagesSection.style.display = 'block';
    } else {
      layoutContainer.innerHTML = '';
      imagesSection.style.display = 'none';
    }
  }
}

function exportPDF() {
  // Validate
  if (!elements.customerName.value.trim()) {
    alert('Please enter customer name');
    elements.customerName.focus();
    return;
  }

  updatePDFTemplate();

  const template = document.getElementById('pdfTemplate');
  const customerName = elements.customerName.value.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `Quotation_${customerName}_${date}.pdf`;

  // Show loading
  elements.exportBtn.disabled = true;
  elements.exportBtn.innerHTML = '<span class="icon">⏳</span> Generating...';

  const opt = {
    margin: [0, 0, 10, 0], // top, right, bottom, left - minimal top margin, bottom for page numbers
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  // Make template visible temporarily
  template.style.position = 'static';
  template.style.left = '0';

  html2pdf().set(opt).from(template.querySelector('.pdf-content')).toPdf().get('pdf').then(function (pdf) {
    const totalPages = pdf.internal.getNumberOfPages();

    // Add page numbers to each page
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageText = `${i}/${totalPages}`;

      // Center the page number at the bottom
      const textWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (pageWidth - textWidth) / 2, pageHeight - 5);
    }
  }).save().then(() => {
    // Hide template again
    template.style.position = 'absolute';
    template.style.left = '-9999px';

    // Restore button
    elements.exportBtn.disabled = false;
    elements.exportBtn.innerHTML = '<span class="icon">📄</span> Export PDF';
  });
}

// ==================== Utilities ====================
function formatNumber(num) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

// ==================== Start ====================
document.addEventListener('DOMContentLoaded', init);
