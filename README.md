# Cornerstone BigCommerce Test

Please see the initial commit for all changes. Also, see below for notes regarding the implementation.
I noticed the server was returning a 503 Service Unavailable error when trying to create a cart via the API. One way around this
is to add the item to the cart via the "Add Cart" via the product card, and then test the "Add All To Cart" functionality.

Notes:
1. CSS was included in the category.html file. Normally, I'd include this in a style sheet.
2. The following functions were added to category.js:
    - addAllItemsToCart
    - changeImageOnHover
    - removeAllItemsFromCart
    - verifyItemsInCart
3. The bonus question is included in the category.html file.
4. Normally, we'd want to add the items to the cart dynamically. The Add All Items button references the product ID directly.
5. The StoreFront API is used for creating, adding to, and deleting a cart.
