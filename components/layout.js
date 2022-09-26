import Header from "../components/header.js";

export default function Layout({ children }) {
    return (
      <>
        <Header />
        <main>{children}</main>
      </>
    )
  }