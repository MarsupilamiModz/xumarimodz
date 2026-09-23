; XUMARI MODZ Launcher — Professional Windows Setup
; Requires Inno Setup 6.x: https://jrsoftware.org/isinfo.php

#define AppName "XUMARI MODZ Launcher"
#define AppVersion "1.0.0"
#define AppPublisher "XUMARI MODZ"
#define AppExeName "XumariModz.Launcher.exe"
#define AppUrl "https://xumarimodz.com"

[Setup]
AppId={{A7B3C4D5-E6F7-4890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppUrl}
AppSupportURL={#AppUrl}/support
AppUpdatesURL={#AppUrl}/downloads/launcher
DefaultDirName={autopf}\XUMARI MODZ\Launcher
DefaultGroupName=XUMARI MODZ
DisableProgramGroupPage=no
OutputDir=..\artifacts\setup
OutputBaseFilename=XUMARI_MODZ_Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "autoupdate"; Description: "Automatische Launcher-Updates aktivieren"; GroupDescription: "Update-Einstellungen:"; Flags: checked

[Files]
Source: "..\artifacts\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Optional MSIX bundle for sideload / enterprise deployment
Source: "..\artifacts\msix\*.msix"; DestDir: "{app}\packages"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{#AppName} deinstallieren"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\XUMARI MODZ\Launcher"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\XUMARI MODZ\Launcher"; ValueType: string; ValueName: "Version"; ValueData: "{#AppVersion}"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\XUMARI MODZ\Launcher"; ValueType: dword; ValueName: "AutoUpdate"; ValueData: "1"; Tasks: autoupdate; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\XUMARI MODZ\Launcher"; ValueType: dword; ValueName: "AutoUpdate"; ValueData: "0"; Tasks: not autoupdate; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\xumarimodz"; ValueType: string; ValueData: "URL:XUMARI MODZ Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\xumarimodz"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\xumarimodz\shell\open\command"; ValueType: string; ValueData: """{app}\{#AppExeName}"" ""%1"""; Flags: uninsdeletekey

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\XumariModz\Launcher\updates"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    { First-run settings.json seed — launcher merges on startup }
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
end;
