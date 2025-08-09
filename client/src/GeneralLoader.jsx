import "./GeneralLoader.css";

/**
 * GeneralLoader - A simple, theme-aware spinner loader.
 * Pass theme="dark" or theme="light" to match your app.
 * Example: <GeneralLoader theme={theme} />
 */
const GeneralLoader = ({ theme = "light" }) => (
  <div className={`general-loader general-loader--${theme}`}>
    <div className="general-loader__spinner"></div>
  </div>
);

export default GeneralLoader;