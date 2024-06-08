import type { TeamRepository } from '@/repositories/TeamRepository';
import type { UserRepository } from '@/repositories/UserRepository';
import type { TeamService } from '@/services/TeamService';
import type {
  BodyEmailHandler,
  ParamsEmailHandler,
} from '@/validations/UserValidation';

export class UserController {
  private teamService: TeamService;

  private userRepository: UserRepository;

  private teamRepository: TeamRepository;

  constructor(
    teamService: TeamService,
    userRepository: UserRepository,
    teamRepository: TeamRepository,
  ) {
    this.teamService = teamService;
    this.userRepository = userRepository;
    this.teamRepository = teamRepository;
  }

  /**
   * Retrieve User information or create a new User, it happens when the user signs in for the first time.
   */
  public getProfile: ParamsEmailHandler = async (req, res) => {
    const user = await this.userRepository.findOrCreate(req.currentUserId);

    if (user.getTeamList().length === 0) {
      // Create a new team when the user isn't member of any team
      await this.teamService.create('New Team', user, req.query.email);
    }

    const dbTeamList = await this.teamRepository.findAllByTeamIdList(
      user.getTeamList(),
    );

    const teamList = dbTeamList.map((team) => ({
      id: team.id,
      displayName: team.getDisplayName(),
    }));

    res.json({
      id: user.providerId,
      firstSignIn: user.getFirstSignIn().toISOString(),
      globalRole: user.getGlobalRole(),
      teamList,
    });
  };

  public updateEmail: BodyEmailHandler = async (req, res) => {
    const user = await this.userRepository.strictFindByUserId(
      req.currentUserId,
    );

    await this.teamService.updateEmailAllTeams(user, req.body.email);

    res.json({
      id: user.providerId,
      email: req.body.email,
    });
  };
}
