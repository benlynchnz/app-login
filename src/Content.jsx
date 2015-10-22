import css from "./Login.css";

export default class LoginAppContent extends React.Component {
  constructor(props) {
    super(props);
    this._onClick = this._onClick.bind(this);
  }

  _onClick() {
    const pass = this.refs.password.getDOMNode().value;
    if (pass === "letmesee") {
      window.location = "/builds";
    } else {
      alert("nope");
    }
  }

  render() {
    return (
      <div className={css.content}>
        <input
          type="password"
          ref="password"
          className={css.input}
          placeholder="password" />
        <button className={css.button} onClick={this._onClick}>Go</button>
      </div>
    );
  }
}
