import css from "./Login.css";

export default class LoginAppContent extends React.Component {
  static propTypes = {
    //element: React.PropTypes.object.isRequired
  }

  static defaultProps = {
    //element: {}
  }

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className={css.content}>
        <p>A login form</p>
      </div>
    );
  }
}
