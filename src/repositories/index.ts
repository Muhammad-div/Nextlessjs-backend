import { dbClient } from '@/utils/DBClient';

import { MemberRepository } from './MemberRepository';
import { TeamRepository } from './TeamRepository';
import { TodoRepository } from './TodoRepository';
import { UserRepository } from './UserRepository';

const memberRepository = new MemberRepository(dbClient);
const teamRepository = new TeamRepository(dbClient);
const todoRepository = new TodoRepository(dbClient);
const userRepository = new UserRepository(dbClient);

export { memberRepository, teamRepository, todoRepository, userRepository };
