import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { movie_id, episode_id } = body || {};
    if (!movie_id) return Response.json({ error: 'movie_id required' }, { status: 400 });

    const me = await base44.asServiceRole.entities.User.get(user.id);
    if (me.membership_status !== 'active') {
      await base44.asServiceRole.entities.SecurityLog.create({
        action: 'video_access_denied', user_id: user.id, user_email: user.email,
        detail: 'membership inactive: ' + movie_id, level: 'warning'
      });
      return Response.json({ error: 'üyelik aktif değil' }, { status: 403 });
    }

    const movie = await base44.asServiceRole.entities.Movie.get(movie_id);
    if (!movie) return Response.json({ error: 'içerik bulunamadı' }, { status: 404 });

    let url = '';
    if (episode_id) {
      const eps = await base44.asServiceRole.entities.Episode.filter({ series_id: movie_id });
      const ep = eps.find((e) => e.id === episode_id) || eps[0];
      url = ep?.video_url || ep?.hls_url || '';
    } else if (movie.video_file_uri) {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: movie.video_file_uri, expires_in: 3600
      });
      url = signed.signed_url;
    } else {
      url = movie.video_url || movie.hls_url || movie.external_url || '';
    }

    if (!url) return Response.json({ error: 'video kaynağı yok' }, { status: 404 });
    await base44.asServiceRole.entities.SecurityLog.create({
      action: 'video_authorized', user_id: user.id, user_email: user.email,
      detail: movie_id, level: 'info'
    });
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}