export abstract class AbstractEmailTemplate {
  public abstract buildSubject(): string;

  public abstract buildText(): string;
}
