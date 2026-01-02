"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Shield,
  Key,
  Loader2,
  Save,
  Lock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export default function ProfilePage() {
  const { user, organizations, organizationId, setAuth, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const currentOrg = organizations.find((org) => org.id === organizationId);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.put("/user/profile", {
        name: profileData.name,
        email: profileData.email,
      });

      // Update auth state with new user data
      if (user && token) {
        setAuth(token, response.data);
      }

      setMessage("Profile updated successfully!");
    } catch (error: any) {
      setError(error.response?.data || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setError("");
    setMessage("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords don't match");
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setPasswordLoading(false);
      return;
    }

    try {
      await api.put("/user/password", {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      setMessage("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      setError(error.response?.data || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 p-6 max-w-9xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="size-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4">
                    <Avatar className="size-20">
                      <AvatarImage
                        src={`https://api.dicebear.com/9.x/initials/svg?seed=${user?.name || "U"}`}
                      />
                      <AvatarFallback className="text-lg">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <h3 className="font-semibold">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Avatar generated from your initials
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Form */}
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) =>
                            handleProfileInputChange("name", e.target.value)
                          }
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            handleProfileInputChange("email", e.target.value)
                          }
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="size-5" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          handlePasswordInputChange("currentPassword", e.target.value)
                        }
                        placeholder="Enter your current password"
                        required
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            handlePasswordInputChange("newPassword", e.target.value)
                          }
                          placeholder="Enter new password"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            handlePasswordInputChange("confirmPassword", e.target.value)
                          }
                          placeholder="Confirm new password"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={passwordLoading}>
                        {passwordLoading ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          <>
                            <Key className="size-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline">Owner</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Member since</span>
                <span className="text-sm">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Organization */}
          {currentOrg && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="size-4" />
                  Current Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{currentOrg.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentOrg.slug}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant="outline" className="capitalize">
                    {currentOrg.plan}
                  </Badge>
                </div>
                  <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Devices</span>
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {currentOrg.max_devices === -1
                      ? "Unlimited"
                      : currentOrg.max_devices}
                  </span>
                </div>
                  <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SMS/month</span>
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {currentOrg.sms_monthly_limit && currentOrg.sms_monthly_limit > 0
                      ? currentOrg.sms_monthly_limit.toLocaleString()
                      : "Pay-per-use"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}