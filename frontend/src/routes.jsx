import { Home, Products, ProductDetails, Profile, SignIn, SignUp, ShoppingList, Dashboard } from "@/pages";
import PrivacyPolicy from "./pages/privacy-policy";
import Newsletter from "./pages/newsletter";

export const routes = [
  {
    name: "Domov",
    path: "/home",
    element: <Home />,
    showInNav: false,
    showInFooter: true, 
  },
  {
    name: "Izdelki",
    path: "/products",
    element: <Products />,
    showInNav: true,
    showInFooter: true, 
  },
  {
    path: "/products/:id",
    element: <ProductDetails />,
    showInNav: false, 
    showInFooter: false, 
  },
  {
    name: "Nakupovalni seznam",
    path: "/shopping-list",
    element: <ShoppingList />,
    showInNav: true,
    showInFooter: true, 
  },
  {
    name: "Statistika",
    path: "/dashboard",
    element: <Dashboard />,
    showInNav: true,
    showInFooter: true, 
  },
  {
    path: "/sign-in",
    element: <SignIn />,
    showInNav: false,
    showInFooter: false, 
  },
  {
    path: "/sign-up",
    element: <SignUp />,
    showInNav: false,
    showInFooter: false, 
  },
  {
    path: "/profile",
    element: <Profile />,
    showInNav: false,
    showInFooter: false, 
  },
  {
    path: "/privacy-policy",
    element: <PrivacyPolicy />,
    showInNav: false,
    showInFooter: true, 
  },
  {
    path: "/newsletter/action",
    element: <Newsletter />,
    showInNav: false,
    showInFooter: false, 
  },
];


export default routes;
