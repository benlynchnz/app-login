import css from "./Login.css";

export default class LoginAppHeader extends React.Component {
  static propTypes = {}

  static defaultProps = {}

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={css.header}></div>
    );
  }
}
