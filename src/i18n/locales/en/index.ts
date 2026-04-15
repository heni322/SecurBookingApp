import common     from './common';
import auth        from './auth';
import home        from './home';
import missions    from './missions';
import profile     from './profile';
import navigation  from './navigation';
import notifications from './notifications';
import quote       from './quote';
import payment     from './payment';
import account     from './account';

const en = { common, auth, home, missions, profile, navigation, notifications, quote, payment, account } as const;
export default en;
