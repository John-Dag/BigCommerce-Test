import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import swal from './global/sweet-alert';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    //Add the test product from the Special Items page to the cart.
    //First, verify if a cart exists. If it doesn't, create a new cart and add the item.
    //Otherwise, add the item to the existing cart.
    addAllItemsToCart() {
        $('a#addAllToCart').click(function () {
            getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options').then(
                function (data) {
                    if ((data === undefined) || (data.length < 1)) {
                        console.log("creating cart");
                        createCart(`/api/storefront/carts`, {
                            "lineItems": [
                            {
                                "quantity": 1,
                                "productId": 112
                            }
                        ]});
                    }
                    else {
                        addCartItem(`/api/storefront/carts/`, data[0].id, {
                            "lineItems": [
                            {
                                "quantity": 1,
                                "productId": 112
                            }
                            ]
                        });
                    }
                }
            );

            function createCart(url, cartItems) {
                return fetch(url, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json"},
                    body: JSON.stringify(cartItems),
                })
                .then(window.location = '/cart.php');
            };
        
            function getCart(url) {
                return fetch(url, {
                    method: "GET",
                    credentials: "same-origin"
                })
                .then(response => response.json());
            };

            function addCartItem(url, cartId, cartItems) {
                return fetch(url + cartId + '/items', {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json"},
                    body: JSON.stringify(cartItems),
                })
                .then(window.location = '/cart.php')
            };
        });
    }

    //Verifies if a cart exists and deletes it. 
    //A sweet alert message notifies the user when emptying the cart.
    removeAllItemsFromCart() {
        $('a#removeAllFromCart').click(function () {
            getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options').then(
                function(data) {
                    console.log(data);
                    deleteCart(`/api/storefront/carts/`, data[0].id)
                    .then($('a#removeAllFromCart').hide());
                }
            );
                    
            function getCart(url) {
                return fetch(url, {
                    method: "GET",
                    credentials: "same-origin"
                })
                .then(response => response.json());
            };

            function deleteCart(url, cartId) {
                return fetch(url + cartId, {
                    method: "DELETE",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",}
                })
                .then(function () {
                    swal.fire({
                        text: "All items have been removed from your cart!",
                        icon: 'success'
                    });

                    window.location = '/cart.php';
                });
            }
        });
    }

    //Verify if items have been added to a cart.
    //Show or hide the Remove All Items button based on the result.
    verifyItemsInCart() {
        getCart('/api/storefront/carts?include=lineItems.digitalItems.options,lineItems.physicalItems.options').then(
            function(data) {
                if ((data[0]) && (data[0].id)) {
                    $('a#removeAllFromCart').show();
                }
                else {
                    $('a#removeAllFromCart').hide()
                }
            }
        );

        function getCart(url) {
            return fetch(url, {
                method: "GET",
                credentials: "same-origin"
            })
            .then(response => response.json());
        };
    }

    //Show second image when hovering over a product card.
    changeImageOnHover() {
        $('.card-figure').hover(
            function() {
                var mainImage = $(this).find('.card-img-container img');
                var alternateImage = $(this).find('.card-img-container').data('alternate-image');

                if ((alternateImage) && (alternateImage != "")) {
                    mainImage.attr('srcset', alternateImage)
                }
            },
            function() {
                var mainImage = $(this).find('.card-img-container img');

                mainImage.attr('srcset', mainImage.attr('src'));
            }
        );
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        //BigCommerce test functions.
        this.addAllItemsToCart();
        this.changeImageOnHover();
        this.removeAllItemsFromCart();
        this.verifyItemsInCart();

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
