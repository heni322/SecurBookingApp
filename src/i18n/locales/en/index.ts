import common        from './common';
import auth          from './auth';
import home          from './home';
import missions      from './missions';
import profile       from './profile';
import navigation    from './navigation';
import notifications from './notifications';
import quote         from './quote';
import payment       from './payment';
import account       from './account';
import booking       from './booking';
import rating        from './rating';
import dispute       from './dispute';
import tracking      from './tracking';
import conversation  from './conversation';
import services      from './services';
import map_picker    from './map_picker';
import analytics     from './analytics';
import offline_banner from './offline_banner';

const en = {
  common, auth, home, missions, profile, navigation, notifications,
  quote, payment, account,
  booking, rating, dispute, tracking, conversation, services,
  map_picker, analytics, offline_banner,
} as const;
export default en;
