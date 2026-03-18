export const isAdmin = (channel, userId) => {
  return (channel.roles?.admins || []).some(
    (id) => id.toString() === userId.toString()
  );
};

export const isModerator = (channel, userId) => {
  return (channel.roles?.moderators || []).some(
    (id) => id.toString() === userId.toString()
  );
};

export const isMember = (channel, userId) => {
  return (channel.members || []).some(
    (id) => id.toString() === userId.toString()
  );
};
