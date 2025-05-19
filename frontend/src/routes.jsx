import { Home, Products, ProductDetails, Profile, SignIn, SignUp, ShoppingList } from "@/pages";

export const routes = [
  {
    path: "/home",
    element: <Home />,
  },
  {
    name: "Izdelki",
    path: "/products",
    element: <Products />,
  },
  {
    // Route for individual product details
    path: "/products/:id",
    element: <ProductDetails />,
  },
  {
    name: "Nakupovalni seznam",
    path: "/shopping-list",
    element: <ShoppingList />,
  },
  {
    path: "/sign-in",
    element: <SignIn />,
  },
  {
    path: "/sign-up",
    element: <SignUp />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
];

export default routes;
