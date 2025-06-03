import { Home, Products, ProductDetails, Profile, SignIn, SignUp, ShoppingList, Dashboard } from "@/pages";

export const routes = [
  {
    name: "Domov",
    path: "/home",
    element: <Home />,
    showInNav: false, 
  },
  {
    name: "Izdelki",
    path: "/products",
    element: <Products />,
    showInNav: true,
  },
  {
    path: "/products/:id",
    element: <ProductDetails />,
    showInNav: false, 
  },
  {
    name: "Nakupovalni seznam",
    path: "/shopping-list",
    element: <ShoppingList />,
    showInNav: true,
  },
  {
    name: "Statistika",
    path: "/dashboard",
    element: <Dashboard />,
    showInNav: true,
  },
  {
    path: "/sign-in",
    element: <SignIn />,
    showInNav: false,
  },
  {
    path: "/sign-up",
    element: <SignUp />,
    showInNav: false,
  },
  {
    path: "/profile",
    element: <Profile />,
    showInNav: false,
  },
];


export default routes;
