
 const btn = document.getElementById("themeBtn");

if (btn) {
    btn.addEventListener("click", function () {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            btn.textContent = "☀️ الوضع الفاتح";
        } else {
            btn.textContent = "🌙 الوضع الداكن";
        }
    });
}

(function initializeShoppingCart() {
    const storageKey = "aboGafeerShoppingCart";
    const defaultProductPrice = 500;
    let cartItems = readCart();
    const navigation = document.querySelector(".bottom-nav");

    if (!navigation) {
        return;
    }

    const cartToggle = document.createElement("button");
    cartToggle.type = "button";
    cartToggle.className = "nav-item cart-toggle";
    cartToggle.setAttribute("aria-haspopup", "dialog");
    cartToggle.setAttribute("aria-controls", "shopping-cart-dialog");

    const cartIcon = createElement("span", "icon cart-toggle__icon", "🛒");
    const cartCount = createElement("span", "cart-toggle__count", "0");
    cartCount.setAttribute("aria-live", "polite");
    cartIcon.append(cartCount);
    cartToggle.append(cartIcon, createElement("span", "cart-toggle__label", "السلة"));
    navigation.append(cartToggle);

    const dialog = createElement("dialog", "cart-dialog");
    dialog.id = "shopping-cart-dialog";
    dialog.setAttribute("aria-labelledby", "shopping-cart-title");

    const header = createElement("div", "cart-dialog__header");
    header.append(createElement("h2", "cart-dialog__title", "سلة المشتريات"));
    const closeButton = createElement("button", "cart-dialog__close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "إغلاق السلة");
    header.append(closeButton);

    const itemsContainer = createElement("div", "cart-dialog__items");
    itemsContainer.setAttribute("aria-live", "polite");
    const notice = createElement("p", "cart-dialog__notice");
    notice.hidden = true;

    const footer = createElement("div", "cart-dialog__footer");
    const subtotalRow = createElement("div", "cart-total");
    subtotalRow.append(createElement("span", "", "المجموع الفرعي"));
    const subtotalValue = createElement("strong", "", formatCurrency(0));
    subtotalRow.append(subtotalValue);
    const totalRow = createElement("div", "cart-total cart-total--final");
    totalRow.append(createElement("span", "", "المجموع:"));
    const totalValue = createElement("strong", "", formatCurrency(0));
    totalRow.append(totalValue);
    const checkoutButton = createElement("button", "cart-add", "تأكيد الشراء");
    checkoutButton.type = "button";
    footer.append(notice, subtotalRow, totalRow, checkoutButton);
    dialog.append(header, itemsContainer, footer);
    document.body.append(dialog);

    const productCards = Array.from(document.querySelectorAll(".card"));
    productCards.forEach((card, index) => {
        if (!card.hasAttribute("data-price")) {
            card.dataset.price = String(defaultProductPrice);
        }

        const product = getProductFromCard(card, index);
        let priceLabel = card.querySelector(".cart-product-price");
        if (!priceLabel) {
            priceLabel = createElement("p", "cart-product-price");
            card.insertBefore(priceLabel, card.querySelector(".cart-add"));
        }
        priceLabel.textContent = `السعر: ${formatCurrency(product.price)}`;

        if (card.querySelector(".cart-add")) {
            return;
        }
        const button = createElement("button", "cart-add", "إضافة للسلة");
        button.type = "button";
        button.dataset.cartAdd = "";
        button.setAttribute("aria-label", `إضافة ${getProductFromCard(card, index).name} للسلة`);
        card.append(button);
    });

    cartToggle.addEventListener("click", function () {
        renderCart();
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
    });

    closeButton.addEventListener("click", closeCart);
    checkoutButton.addEventListener("click", openWhatsAppCheckout);
    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
            closeCart();
        }
    });

    document.addEventListener("click", function (event) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            return;
        }

        const addButton = target.closest("[data-cart-add]");
        if (addButton) {
            const card = addButton.closest(".card");
            if (card) {
                addProduct(getProductFromCard(card, productCards.indexOf(card)));
            }
            return;
        }

        const actionButton = target.closest("[data-cart-action]");
        if (actionButton) {
            updateQuantity(actionButton.dataset.productId, actionButton.dataset.cartAction);
        }
    });

    window.addEventListener("storage", function (event) {
        if (event.key === storageKey) {
            cartItems = readCart();
            renderCart();
        }
    });

    if (cartItems.length > 0) {
        saveCart();
    }
    renderCart();

    function readCart() {
        try {
            const savedItems = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
            if (!Array.isArray(savedItems)) {
                return [];
            }

            const uniqueItems = new Map();
            savedItems.forEach(function (item) {
                if (!item || typeof item.id !== "string" || typeof item.name !== "string") {
                    return;
                }

                const quantity = Number(item.quantity);
                if (!Number.isFinite(quantity) || quantity < 1) {
                    return;
                }

                const normalized = {
                    id: item.id,
                    name: item.name.trim() || "منتج",
                    price: normalizePrice(item.price) ?? defaultProductPrice,
                    image: typeof item.image === "string" ? item.image : "",
                    quantity: Math.floor(quantity)
                };
                const existing = uniqueItems.get(normalized.id);
                if (existing) {
                    existing.quantity += normalized.quantity;
                    if (existing.price === null && normalized.price !== null) {
                        existing.price = normalized.price;
                    }
                } else {
                    uniqueItems.set(normalized.id, normalized);
                }
            });

            return Array.from(uniqueItems.values());
        } catch (error) {
            return [];
        }
    }

    function normalizePrice(value) {
        if (value === null || value === undefined || value === "") {
            return null;
        }
        const price = Number(value);
        return Number.isFinite(price) && price >= 0 ? price : null;
    }

    function getProductFromCard(card, index) {
        const headings = card.querySelectorAll("h2, h3, h4");
        const name = headings.length
            ? headings[headings.length - 1].textContent.trim()
            : `منتج ${index + 1}`;
        const image = card.querySelector("img");
        const imageSource = image ? (image.getAttribute("src") || "").trim() : "";
        const priceElement = card.querySelector("[data-price]");
        const priceSource = card.getAttribute("data-price") ||
            (priceElement ? priceElement.getAttribute("data-price") : null);
        const slug = encodeURIComponent(name.toLocaleLowerCase().replace(/\s+/g, "-"));

        return {
            id: `${window.location.pathname}:${imageSource || `${slug}-${index}`}`,
            name: name || `منتج ${index + 1}`,
            price: normalizePrice(priceSource) ?? defaultProductPrice,
            image: imageSource
        };
    }

    function addProduct(product) {
        const existing = cartItems.find(function (item) {
            return item.id === product.id;
        });

        if (existing) {
            existing.quantity += 1;
            if (product.price !== null) {
                existing.price = product.price;
            }
            if (product.image) {
                existing.image = product.image;
            }
        } else {
            cartItems.push({ ...product, quantity: 1 });
        }

        saveCart();
        renderCart();
    }

    function updateQuantity(productId, action) {
        const item = cartItems.find(function (cartItem) {
            return cartItem.id === productId;
        });
        if (!item) {
            return;
        }

        if (action === "increase") {
            item.quantity += 1;
        } else if (action === "decrease") {
            item.quantity -= 1;
            if (item.quantity < 1) {
                cartItems = cartItems.filter(function (cartItem) {
                    return cartItem.id !== productId;
                });
            }
        } else if (action === "remove") {
            cartItems = cartItems.filter(function (cartItem) {
                return cartItem.id !== productId;
            });
        }

        saveCart();
        renderCart();
    }

    function saveCart() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(cartItems));
        } catch (error) {
            // Keep the current-page cart usable when browser storage is blocked.
        }
    }

    function renderCart() {
        itemsContainer.replaceChildren();
        let itemCount = 0;
        let total = 0;
        let hasUnknownPrice = false;

        cartItems.forEach(function (item) {
            itemCount += item.quantity;
            if (item.price === null) {
                hasUnknownPrice = true;
            } else {
                total += item.price * item.quantity;
            }
            itemsContainer.append(createCartItem(item));
        });

        if (cartItems.length === 0) {
            itemsContainer.append(createElement("p", "cart-dialog__empty", "السلة فارغة"));
        }

        cartCount.textContent = String(itemCount);
        cartToggle.setAttribute("aria-label", `السلة، ${itemCount} منتجات`);
        const totalText = hasUnknownPrice ? "غير محدد" : formatCurrency(total);
        subtotalValue.textContent = totalText;
        totalValue.textContent = totalText;
        notice.hidden = !hasUnknownPrice;
        notice.textContent = hasUnknownPrice ? "تعذّر حساب الإجمالي لعدم توفر أسعار بعض المنتجات." : "";
    }

    function openWhatsAppCheckout() {
        if (cartItems.length === 0) {
            notice.hidden = false;
            notice.textContent = "السلة فارغة، أضف منتجات أولًا.";
            return;
        }

        const total = cartItems.reduce(function (sum, item) {
            return sum + item.price * item.quantity;
        }, 0);
        const productDetails = cartItems.map(function (item) {
            const itemTotal = item.price * item.quantity;
            return `👕 ${item.name} × ${item.quantity}\nالسعر: ${formatPrice(itemTotal)} جنيه`;
        }).join("\n\n");
        const message = `🛍️ طلب شراء جديد\n\nالمنتجات:\n\n${productDetails}\n\n💰 إجمالي الطلب: ${formatPrice(total)} جنيه`;
        const whatsappUrl = `https://wa.me/201108218981?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }

    function createCartItem(item) {
        const row = createElement("article", "cart-item");
        const imageBox = createElement("div", "cart-item__image");
        const imageFallback = createElement("span", "cart-item__image-fallback is-hidden", "لا توجد صورة");

        if (item.image) {
            const image = createElement("img");
            image.alt = item.name;
            image.addEventListener("error", function () {
                image.classList.add("is-hidden");
                imageFallback.classList.remove("is-hidden");
            }, { once: true });
            image.src = item.image;
            imageBox.append(image);
        } else {
            imageFallback.classList.remove("is-hidden");
        }
        imageBox.append(imageFallback);

        const details = createElement("div", "cart-item__details");
        details.append(createElement("h3", "cart-item__name", item.name));
        details.append(createElement("p", "cart-item__price", `سعر الوحدة: ${item.price === null ? "غير محدد" : formatCurrency(item.price)}`));
        details.append(createElement("p", "cart-item__subtotal", `الإجمالي: ${item.price === null ? "غير محدد" : formatCurrency(item.price * item.quantity)}`));

        const controls = createElement("div", "cart-item__controls");
        const quantityControl = createElement("div", "cart-item__quantity");
        quantityControl.append(createActionButton("decrease", item, "−", `تقليل كمية ${item.name}`));
        quantityControl.append(createElement("span", "cart-item__quantity-value", String(item.quantity)));
        quantityControl.append(createActionButton("increase", item, "+", `زيادة كمية ${item.name}`));
        controls.append(quantityControl, createActionButton("remove", item, "حذف", `حذف ${item.name} من السلة`));
        row.append(imageBox, details, controls);
        return row;
    }

    function createActionButton(action, item, text, label) {
        const button = createElement("button", `cart-action cart-action--${action}`, text);
        button.type = "button";
        button.dataset.cartAction = action;
        button.dataset.productId = item.id;
        button.setAttribute("aria-label", label);
        return button;
    }

    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function formatPrice(price) {
        return new Intl.NumberFormat(document.documentElement.lang || "ar", {
            maximumFractionDigits: 2
        }).format(price);
    }

    function formatCurrency(price) {
        return `${formatPrice(price)} EGP`;
    }

    function closeCart() {
        if (typeof dialog.close === "function" && dialog.open) {
            dialog.close();
        } else {
            dialog.removeAttribute("open");
        }
    }
})();