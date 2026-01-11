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
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  exportImageBtn: document.getElementById('exportImageBtn'),
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

  // Export buttons
  elements.exportPdfBtn.addEventListener('click', exportPDF);
  elements.exportImageBtn.addEventListener('click', exportImage);
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
  // Handle paste from clipboard

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
  // Add all selected files (no limit)
  const toAdd = files;

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
  // Dynamic labels for unlimited images
  const getLabel = (index) => index === 0 ? 'Layout' : `Additional ${index}`;

  elements.imagePreviews.innerHTML = state.images.map((img, index) => `
    <div class="image-preview-item">
      <img src="${img.data}" alt="${img.name}">
      <button class="remove-btn" data-index="${index}">✕</button>
      <div class="image-label">${getLabel(index)}</div>
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

  // Upload area always visible (no limit)
  elements.imageUploadArea.style.display = 'block';
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
  const pdfContent = template.querySelector('.pdf-content');
  const customerName = elements.customerName.value.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `Quotation_${customerName}_${date}.pdf`;

  // Show loading
  elements.exportPdfBtn.disabled = true;
  elements.exportPdfBtn.innerHTML = '<span class="icon">⏳</span> Generating...';

  // Make template visible in normal document flow
  template.style.position = 'static';
  template.style.left = 'auto';

  // Use html2canvas to capture the content, then create single-page PDF
  html2canvas(pdfContent, {
    scale: 2,
    useCORS: true,
    logging: false
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF with custom height to fit all content in one page
    const pdf = new jspdf.jsPDF({
      unit: 'mm',
      format: [imgWidth, pageHeight],
      orientation: 'portrait'
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, pageHeight);
    pdf.save(filename);

    // Hide template again
    template.style.position = 'absolute';
    template.style.left = '-9999px';

    // Restore button
    elements.exportPdfBtn.disabled = false;
    elements.exportPdfBtn.innerHTML = '<span class="icon">📄</span> Export PDF';
  }).catch(error => {
    console.error('Error generating PDF:', error);

    // Hide template again
    template.style.position = 'absolute';
    template.style.left = '-9999px';

    // Restore button
    elements.exportPdfBtn.disabled = false;
    elements.exportPdfBtn.innerHTML = '<span class="icon">📄</span> Export PDF';

    alert('Error generating PDF. Please try again.');
  });
}

function exportImage() {
  // Validate
  if (!elements.customerName.value.trim()) {
    alert('Please enter customer name');
    elements.customerName.focus();
    return;
  }

  updatePDFTemplate();

  const template = document.getElementById('pdfTemplate');
  const pdfContent = template.querySelector('.pdf-content');
  const customerName = elements.customerName.value.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `Quotation_${customerName}_${date}.png`;

  // Show loading
  elements.exportImageBtn.disabled = true;
  elements.exportImageBtn.innerHTML = '<span class="icon">⏳</span> Generating...';

  // Make template visible in normal document flow
  template.style.position = 'static';
  template.style.left = 'auto';

  // Use html2canvas to capture the content as image
  html2canvas(pdfContent, {
    scale: 2,
    useCORS: true,
    logging: false
  }).then(canvas => {
    // Convert canvas to blob and download
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Hide template again
      template.style.position = 'absolute';
      template.style.left = '-9999px';

      // Restore button
      elements.exportImageBtn.disabled = false;
      elements.exportImageBtn.innerHTML = '<span class="icon">🖼️</span> Export Image';
    }, 'image/png');
  }).catch(error => {
    console.error('Error generating image:', error);

    // Hide template again
    template.style.position = 'absolute';
    template.style.left = '-9999px';

    // Restore button
    elements.exportImageBtn.disabled = false;
    elements.exportImageBtn.innerHTML = '<span class="icon">🖼️</span> Export Image';

    alert('Error generating image. Please try again.');
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
