import type { components, paths } from './schema';

export type { components, paths };

type Schemas = components['schemas'];
export type AuthTokens = Schemas['AuthTokensDto'];
export type Me = Schemas['MeDto'];
export type Profile = Schemas['ProfileDto'];
export type QuizAnswersBody = Schemas['QuizAnswersDto'];
export type AppConfig = Schemas['AppConfigDto'];
